# AIrWAVE Full System Test Plan

## 1. Security Testing

### 1.1 Organisation Access Control
```bash
# Test each organisation's isolation
1. Create test assets for Organisation A
2. Attempt access from Organisation B
3. Verify access denied
4. Test asset sharing between organisations
```

### 1.2 RLS Policy Validation
```bash
# Test production RLS policies
1. Verify asset creation restrictions
2. Test organisation-based queries
3. Validate cross-organisation access prevention
4. Check audit logging
```

### 1.3 Rate Limiting
```bash
# Test upload limits
1. Verify 100 uploads/hour limit
2. Test concurrent uploads
3. Check rate limit reset
```

## 2. Asset Management

### 2.1 File Validation
```bash
# Test supported file types
- Images: JPG, PNG, GIF
- Videos: MP4, MOV, AVI
- Size limit: 100MB
```

### 2.2 Asset Operations
```bash
# Test core functionality
1. Upload assets
2. Filter by type
3. Sort by date/name
4. Favourite/unfavourite
```

## 3. Campaign Creation

### 3.1 Brief Submission
```bash
# Test brief workflow
1. Create new brief
2. Add campaign details
3. Select target audience
4. Set campaign objectives
```

### 3.2 Asset Selection
```bash
# Test asset handling
1. Select multiple assets
2. Create combinations
3. Preview layouts
4. Save draft state
```

## 4. Client Approval Flow

### 4.1 Client Portal
```bash
# Test client interaction
1. Generate access link
2. Test email notifications
3. Verify approval process
4. Check rejection handling
```

### 4.2 Feedback System
```bash
# Test feedback collection
1. Add comments
2. Request revisions
3. Track changes
4. Final approval
```

## 5. Export System

### 5.1 Platform Export
```bash
# Test export functionality
1. Select platforms
2. Configure settings
3. Verify optimisation
4. Check export logs
```

### 5.2 Asset Optimisation
```bash
# Test optimisation features
1. Image resizing
2. Video transcoding
3. Format conversion
4. Quality settings
```

## 6. Performance Testing

### 6.1 Load Testing
```bash
# Test system under load
1. Upload 100+ assets
2. Multiple concurrent users
3. Large campaign matrices
4. Bulk operations
```

### 6.2 Response Times
```bash
# Test system responsiveness
1. Asset loading < 2s
2. Preview generation < 5s
3. Export initiation < 3s
```

## 7. Error Handling

### 7.1 Recovery Scenarios
```bash
# Test error recovery
1. Network interruptions
2. Invalid file uploads
3. Service unavailability
4. Database timeouts
```

### 7.2 User Feedback
```bash
# Test error messaging
1. Clear error messages
2. Helpful recovery steps
3. Support contact info
```

## Test Execution Steps

1. Start Local Environment:
```bash
npm start  # Start development server
```

2. Run Security Tests:
```bash
npm test src/tests/security/rls.test.ts
```

3. Run E2E Tests:
```bash
npx playwright test
```

4. Run Performance Tests:
```bash
npm run test:performance
```

## Important Notes

1. Security Priorities:
   - Always test with proper organisation context
   - Verify RLS policies are enforced
   - Check audit logging for all operations

2. UK English Standards:
   - All UI text uses UK English spelling
   - Error messages follow UK English conventions
   - Documentation maintains consistent spelling

3. Performance Targets:
   - Asset loading: < 2 seconds
   - Preview generation: < 5 seconds
   - Export initiation: < 3 seconds

4. Test Data Requirements:
   - Multiple test organisations
   - Various asset types and sizes
   - Different user roles and permissions
