# Switchyard

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated by the user: React, TypeScript, Vite, Node, and Docker Compose. The user chose building directly in code.

## Users

Inferred from the hackathon's developer-tools track: engineers rehearsing releases and judges assessing the contribution to self-hosted Flagsmith.

## Product Purpose

Build a competitive entry for Track 03 of Toggle Wars: a reusable release rehearsal workbench built on self-hosted open-source Flagsmith.

## Positioning

A deterministic release-safety lab combining request-level simulation, cohort analysis, failure injection, guarded rollback, and portable evidence. Flagsmith supplies flag evaluation and management in connected mode.

## Operating Context

Self-hosted Flagsmith via Docker Compose. A fully usable browser sandbox is available without credentials; all traffic and outcomes are explicitly synthetic.

## Capabilities and Constraints

Live mode must keep API credentials on the server and acknowledge remote flag mutations before reporting success. Sandbox must never claim a real Flagsmith connection. Rollback targets the lab environment only. No guarantee of winning is possible. Docker is not installed in the build environment.

## Evidence on Hand

Official hackathon page and Flagsmith documentation. No real customer metrics, production incidents, or performance claims.

## Product Principles

- Demonstrate the failure and recovery with reproducible requests.
- Surface cohort failures that an aggregate can hide.
- Preserve evidence and make the developer tooling reusable.
- Clearly distinguish simulation from real infrastructure.
