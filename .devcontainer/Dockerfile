FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends software-properties-common \
    && add-apt-repository -y universe \
    && apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        dbus-x11 \
        file \
        libayatana-appindicator3-dev \
        libglib2.0-dev \
        libgtk-3-dev \
        libssl-dev \
        librsvg2-dev \
        libwebkit2gtk-4.1-dev \
        libxdo-dev \
        openbox \
        openjdk-17-jre-headless \
        pkg-config \
        patchelf \
        websockify \
        wget \
        x11-utils \
        x11vnc \
        xauth \
        xvfb \
        novnc \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*
