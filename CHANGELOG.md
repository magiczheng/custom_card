# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-31

### Added

- Initial release of Battery Monitor Card.
- Configurable battery entity list (YAML and visual editor, multi-entity picker).
- Remaining charge shown as a percentage.
- Battery icon that changes with the charge level (10% steps).
- Threshold based icon / percentage / bar colors (green, amber, orange, red by default).
- Remaining charge progress bar with smooth transitions.
- Header summary: average level, lowest level and low-battery count.
- Sorting (none / asc / desc / name) and 1-3 column responsive layouts.
- Per-entity overrides: name, icon, fixed color, area.
- Tap / hold actions (`more-info`, `toggle`, `navigate`, `url`, `fire-dom-event`, `none`).
- Light and dark theme support via Home Assistant CSS variables.
- Simplified Chinese and English localization.
- HACS custom repository support (`hacs.json`, single-file zero-build distribution).
