#!/usr/bin/env bash
set -euo pipefail

# Configurazione parametrizzabile via env o argomenti
PROJECT_ID="${PROJECT_ID:-${1:-workspace-mcp-682108}}"
REGION="${REGION:-${2:-europe-west8}}"
SERVICE="${SERVICE:-${3:-mymovies-api}}"
IMAGE_REPO="${IMAGE_REPO:-${4:-europe-west8-docker.pkg.dev/${PROJECT_ID}/containers}}"
IMAGE_NAME="${IMAGE_NAME:-${5:-mymovies-api}}"
IMAGE_REF="${IMAGE_REF:-${IMAGE_REPO}/${IMAGE_NAME}:latest}"

echo "Project:     ${PROJECT_ID}"
echo "Region:      ${REGION}"
echo "Service:     ${SERVICE}"
echo "Image repo:  ${IMAGE_REPO}"
echo "Image name:  ${IMAGE_NAME}"
echo "Image ref:   ${IMAGE_REF}"

gcloud config set project "${PROJECT_ID}" >/dev/null
gcloud config set run/region "${REGION}" >/dev/null

echo "Enabling APIs (idempotent)..."
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com >/dev/null

echo "Ensuring Artifact Registry exists (idempotent)..."
gcloud artifacts repositories create containers \
  --repository-format=docker \
  --location="${REGION}" \
  --description="Containers" \
  --quiet || true

echo "Building image via Cloud Build..."
gcloud builds submit --region="${REGION}" --tag "${IMAGE_REF}" .

echo "Deploying to Cloud Run..."
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE_REF}" \
  --platform managed \
  --region "${REGION}" \
  --allow-unauthenticated \
  --timeout=300 --concurrency=1 --cpu=1 --memory=1Gi

echo "Service URL:"
gcloud run services describe "${SERVICE}" --region "${REGION}" --format='value(status.url)'

