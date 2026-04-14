#!/bin/bash
set -e

IMAGE_NAME="kawaz-frontend"
TAG="${1:-latest}"

docker build -t "${IMAGE_NAME}:${TAG}" .
echo "Built ${IMAGE_NAME}:${TAG}"
