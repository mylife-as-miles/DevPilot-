# Use the official Microsoft Playwright image as a base
# It already comes with Node.js and all browser dependencies
FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Set environment variables for non-interactive installation
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies for the GUI stack
RUN apt-get update && apt-get install -y \
    xvfb \
    fluxbox \
    wget \
    libxfont2 \
    libxkbfile1 \
    libjpeg-turbo8 \
    x11-xserver-utils \
    libnss3-tools \
    sudo \
    && wget https://github.com/kasmtech/KasmVNC/releases/download/v1.3.3/kasmvncserver_focal_1.3.3_amd64.deb \
    && apt-get install -y ./kasmvncserver_focal_1.3.3_amd64.deb \
    && rm -f kasmvncserver_focal_1.3.3_amd64.deb \
    && rm -rf /var/lib/apt/lists/*

# Pre-configure KasmVNC system-wide to bypass prompts
RUN mkdir -p /etc/kasmvnc && \
    for f in /usr/bin/kasmvncadduser /usr/bin/kasmvncuser /usr/share/kasmvnc/bin/kasmvncadduser /usr/share/kasmvnc/bin/kasmvncuser; do \
    if [ -f "$f" ]; then \
    echo "Found KasmVNC tool at $f"; \
    $f -u devpilot -p devpilot -w; \
    mv /root/.vnc/kasmvncauth.db /etc/kasmvnc/kasmvncauth.db; \
    break; \
    fi; \
    done && \
    chown -R root:root /etc/kasmvnc

# Create a non-root user for KasmVNC
RUN useradd -m -s /bin/bash devpilot && \
    echo "devpilot ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Set the working directory
WORKDIR /app

# Copy application files
COPY . .

# Install dependencies and build
RUN npm install
RUN npm run build

# Ensure correct permissions for the devpilot user
RUN chown -R devpilot:devpilot /app && \
    mkdir -p /home/devpilot/.vnc && \
    chown -R devpilot:devpilot /home/devpilot

# Switch to non-root user
USER devpilot

# Cloud Run expects the service to listen on $PORT
# noVNC and websockify will use internal ports linked to this
ENV PORT=8080
ENV WS_PORT=6080

# Expose the ports (informative for local use)
EXPOSE 8080
EXPOSE 6080

# Start the sandbox using the helper script
CMD ["./start.sh"]
