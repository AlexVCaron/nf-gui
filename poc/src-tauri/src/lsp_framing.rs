use std::io::{self, BufRead, Write};

const MAX_HEADER_BYTES: usize = 8 * 1024;
const MAX_BODY_BYTES: usize = 8 * 1024 * 1024;

pub fn read_message<R: BufRead>(reader: &mut R) -> io::Result<Option<Vec<u8>>> {
    let Some(header) = read_header(reader)? else {
        return Ok(None);
    };

    let length = parse_content_length(&header)?;
    if length > MAX_BODY_BYTES {
        return Err(invalid_data(
            "LSP message exceeds the configured size limit",
        ));
    }

    let mut body = vec![0; length];
    reader.read_exact(&mut body)?;
    Ok(Some(body))
}

pub fn write_message<W: Write>(writer: &mut W, body: &[u8]) -> io::Result<()> {
    if body.len() > MAX_BODY_BYTES {
        return Err(invalid_input(
            "LSP message exceeds the configured size limit",
        ));
    }

    write!(writer, "Content-Length: {}\r\n\r\n", body.len())?;
    writer.write_all(body)?;
    writer.flush()
}

fn read_header<R: BufRead>(reader: &mut R) -> io::Result<Option<Vec<u8>>> {
    let mut header = Vec::new();

    loop {
        let available = reader.fill_buf()?;
        if available.is_empty() {
            return if header.is_empty() {
                Ok(None)
            } else {
                Err(invalid_data("incomplete LSP message header"))
            };
        }

        let line_length = available
            .iter()
            .position(|byte| *byte == b'\n')
            .map_or(available.len(), |index| index + 1);
        if header.len().saturating_add(line_length) > MAX_HEADER_BYTES {
            return Err(invalid_data(
                "LSP message header exceeds the configured size limit",
            ));
        }

        header.extend_from_slice(&available[..line_length]);
        reader.consume(line_length);
        if header.ends_with(b"\r\n\r\n") {
            return Ok(Some(header));
        }
    }
}

fn parse_content_length(header: &[u8]) -> io::Result<usize> {
    let header = std::str::from_utf8(header)
        .map_err(|_| invalid_data("LSP message header is not valid UTF-8"))?;
    if !header.is_ascii() || !header.ends_with("\r\n\r\n") {
        return Err(invalid_data("invalid LSP message header"));
    }

    let mut content_length = None;
    for line in header[..header.len() - 4].split("\r\n") {
        let (name, value) = line
            .split_once(':')
            .ok_or_else(|| invalid_data("malformed LSP message header field"))?;
        if name.is_empty() || !name.bytes().all(is_header_name_byte) {
            return Err(invalid_data("invalid LSP message header field name"));
        }

        if name.eq_ignore_ascii_case("Content-Length") {
            if content_length.is_some() {
                return Err(invalid_data("duplicate Content-Length header"));
            }

            let value = value.trim_matches([' ', '\t']);
            if value.is_empty() || !value.bytes().all(|byte| byte.is_ascii_digit()) {
                return Err(invalid_data("invalid Content-Length header"));
            }
            content_length = Some(
                value
                    .parse()
                    .map_err(|_| invalid_data("Content-Length value is too large"))?,
            );
        }
    }

    content_length.ok_or_else(|| invalid_data("missing Content-Length header"))
}

fn is_header_name_byte(byte: u8) -> bool {
    byte.is_ascii_alphanumeric() || b"!#$%&'*+-.^_`|~".contains(&byte)
}

fn invalid_data(message: &str) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, message)
}

fn invalid_input(message: &str) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidInput, message)
}

#[cfg(test)]
mod tests {
    use super::{MAX_BODY_BYTES, MAX_HEADER_BYTES, read_message, write_message};
    use std::io::{BufReader, ErrorKind};

    #[test]
    fn reads_content_length_framed_utf8_body() {
        let body = br#"{"jsonrpc":"2.0","method":"initialized","params":{"name":"Nextflow"}}"#;
        let mut input = format!(
            "Content-Type: application/vscode-jsonrpc; charset=utf-8\r\nContent-Length: {}\r\n\r\n",
            body.len()
        )
        .into_bytes();
        input.extend_from_slice(body);

        assert_eq!(
            read_message(&mut BufReader::new(input.as_slice())).unwrap(),
            Some(body.to_vec())
        );
    }

    #[test]
    fn reads_consecutive_messages_then_clean_eof() {
        let mut input = Vec::new();
        write_message(&mut input, b"one").unwrap();
        write_message(&mut input, b"two").unwrap();
        let mut reader = BufReader::new(input.as_slice());

        assert_eq!(read_message(&mut reader).unwrap(), Some(b"one".to_vec()));
        assert_eq!(read_message(&mut reader).unwrap(), Some(b"two".to_vec()));
        assert_eq!(read_message(&mut reader).unwrap(), None);
    }

    #[test]
    fn rejects_missing_duplicate_and_malformed_lengths() {
        for header in [
            b"Content-Type: application/json\r\n\r\n".as_slice(),
            b"Content-Length: 1\r\nContent-Length: 1\r\n\r\n".as_slice(),
            b"Content-Length: +1\r\n\r\n".as_slice(),
        ] {
            let error = read_message(&mut BufReader::new(header)).unwrap_err();
            assert_eq!(error.kind(), ErrorKind::InvalidData);
        }
    }

    #[test]
    fn rejects_oversized_body_before_allocating_or_reading_it() {
        let header = format!("Content-Length: {}\r\n\r\n", MAX_BODY_BYTES + 1);
        let error = read_message(&mut BufReader::new(header.as_bytes())).unwrap_err();
        assert_eq!(error.kind(), ErrorKind::InvalidData);
    }

    #[test]
    fn rejects_oversized_or_truncated_headers() {
        let oversized = vec![b'a'; MAX_HEADER_BYTES + 1];
        let error = read_message(&mut BufReader::new(oversized.as_slice())).unwrap_err();
        assert_eq!(error.kind(), ErrorKind::InvalidData);

        let error =
            read_message(&mut BufReader::new(b"Content-Length: 3\r\n".as_slice())).unwrap_err();
        assert_eq!(error.kind(), ErrorKind::InvalidData);
    }

    #[test]
    fn rejects_truncated_body() {
        let error = read_message(&mut BufReader::new(
            b"Content-Length: 3\r\n\r\nab".as_slice(),
        ))
        .unwrap_err();
        assert_eq!(error.kind(), ErrorKind::UnexpectedEof);
    }

    #[test]
    fn writes_exact_lsp_frame() {
        let mut output = Vec::new();
        write_message(&mut output, b"hello").unwrap();
        assert_eq!(output, b"Content-Length: 5\r\n\r\nhello");
    }
}
