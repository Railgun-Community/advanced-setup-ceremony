#!/bin/bash
INSTANCES="${1:-2}"
docker compose up --build --scale app=$INSTANCES
