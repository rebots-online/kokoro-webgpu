# Project Conventions

## Code Organization

### 1. Directory Structure
```
kokoro-webgpu/
├── src/
│   ├── core/           # Core WebGPU implementation
│   ├── audio/          # Audio processing
│   ├── models/         # Model definitions
│   ├── ui/             # UI components
│   └── utils/          # Shared utilities
├── models/             # Model files and manifests
├── voices/             # Voice packs
├── scripts/            # Build and utility scripts
├── docs/              # Project documentation
│   ├── CONVENTIONS.md  # Project conventions
│   ├── DIAGRAMS.md    # Architecture diagrams
│   ├── IDEOLOGIES.md  # Project philosophy
│   ├── TODO.md        # Development roadmap
│   ├── CHANGELOG.md   # Version history
│   └── *.md           # Additional documentation
└── README.md         # Project overview
```

### 2. Naming Conventions
- Files: kebab-case (e.g., `audio-processor.ts`)
- Classes: PascalCase (e.g., `AudioProcessor`)
- Functions: camelCase (e.g., `processAudioChunk`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_BUFFER_SIZE`)
- Components: PascalCase (e.g., `VoiceSelector`)

### 3. WebGPU Standards
- Shader naming: `<operation>_<datatype>.wgsl`
- Buffer naming: `<purpose>Buffer` (e.g., `audioBuffer`)
- Pipeline states: Explicit state management
- Error handling: Graceful fallbacks

### 4. State Management
- Immutable state updates
- Action-based mutations
- Background processing queue
- Cache invalidation rules

## Documentation

### 1. Code Comments
- JSDoc for public APIs
- Implementation notes for complex algorithms
- Performance considerations
- WebGPU-specific annotations

### 2. Commit Messages
Format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- feat: New feature
- fix: Bug fix
- perf: Performance improvement
- refactor: Code change
- docs: Documentation
- chore: Maintenance

### 3. Pull Requests
- Feature description
- Performance impact
- Browser compatibility
- Mobile considerations

## Testing

### 1. Unit Tests
- WebGPU operation validation
- Audio processing verification
- State management checks
- UI component testing

### 2. Performance Tests
- Memory usage monitoring
- CPU/GPU profiling
- Streaming latency checks
- Cache efficiency metrics

### 3. Browser Testing
- WebGPU capability detection
- Fallback behavior
- Mobile responsiveness
- Memory constraints

## Development Workflow

### 1. Feature Implementation
1. Design document
2. Performance considerations
3. Implementation
4. Testing
5. Documentation
6. Review

### 2. Performance Optimization
1. Profiling
2. Bottleneck identification
3. Optimization implementation
4. Validation
5. Documentation update

### 3. Release Process
1. Version bump
2. Changelog update
3. Documentation review
4. Performance validation
5. Release notes
6. Deployment

## Version Control Standards
- Branch naming: 
  - `master`: Stable release branch
  - `wscribe`: Active development branch
  - Feature branches: `feature/<name>`
  - Bugfix branches: `fix/<issue-number>`
- Commit messages: Follow conventional commits format
  ```
  <type>(<scope>): <subject>
  ```
  Example: `feat(audio): implement streaming buffer`
- Version tags: Follow semantic versioning (MAJOR.MINOR.PATCH)

## Mobile Considerations (Future)

### 1. ONNX Implementation
- Model optimization
- Memory constraints
- Battery impact
- Offline capability

### 2. Android-Specific
- ONNX runtime integration
- Resource management
- Background processing
- Cache strategy
