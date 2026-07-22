---
trigger: model_decision
description: when Prompt tell Act as Tester or QA.and any of the testing flow Task.
---

# QA & Testing Standards

## Philosophy

Every implementation must be production-ready.

Do not assume that code works because it compiles.

Every feature must be validated from the perspective of:

- End User
- Product Owner
- Senior QA Engineer
- Backend Engineer
- Frontend Engineer
- Accessibility Tester
- Performance Engineer
- Security Tester

---

# Mandatory Implementation Plan

Every task MUST include an Implementation Plan before coding.

The plan should include:

1. Problem Understanding
2. Assumptions
3. Impacted Components
4. API Dependencies
5. UI Changes
6. State Management
7. Error Handling
8. Loading Strategy
9. Accessibility
10. Performance Considerations
11. Testing Strategy
12. Regression Scope
13. Risks
14. Rollback Strategy

---

# Mandatory Testing

Every feature MUST be tested before completion.

Testing includes:

## Functional Testing

- Happy Path
- Negative Cases
- Empty State
- Error State
- Loading State
- Success State
- Retry Flow
- Validation
- Authorization
- Authentication

---

## UI Testing

Validate:

- Responsive layout
- Mobile
- Tablet
- Desktop
- Loading skeletons
- Disabled controls
- Overflow
- Empty states
- Long content
- Pagination
- Search
- Sorting
- Filtering
- Theme compatibility
- Accessibility

---

## API Testing

Inspect every API request using the browser Network tab.

Validate:

- Endpoint
- Method
- Payload
- Authentication
- Response schema
- Latency
- Status code
- Error responses
- Retry behavior
- Timeout handling

If an API fails:

1. Inspect the response.
2. Identify the root cause.
3. Determine whether the issue is frontend or backend.
4. Implement a safe frontend fallback where possible.
5. Document the issue and fix.

---

## Edge Cases

Always test:

- Empty API response
- Missing properties
- Null values
- Duplicate clicks
- Rapid user interaction
- Slow network
- Offline mode
- Browser refresh
- Back navigation
- Multiple tabs
- Expired sessions
- Unauthorized access
- Forbidden access
- Server errors (500)
- Not found (404)
- Bad request (400)
- Rate limiting (429)
- Gateway timeout (504)
- Very large datasets
- Large text
- Unicode
- Emojis
- Special characters
- Invalid files
- Large uploads
- Timezone differences

---

## State Validation

Verify:

- Initial state
- Loading state
- Success state
- Empty state
- Error state
- Retry state
- Refresh state
- Optimistic updates
- Cache synchronization

---

## Accessibility

Validate:

- Keyboard navigation
- Focus management
- Screen reader support
- ARIA labels
- Color contrast
- Semantic HTML

---

## Performance

Check:

- Duplicate API requests
- Unnecessary renders
- Memory leaks
- Bundle impact
- Loading performance
- API latency
- Lazy loading
- Virtualization where appropriate

---

## Security

Validate:

- Input validation
- XSS
- Injection attempts
- Authorization
- Authentication
- Sensitive data exposure
- Token handling

---

## Bug Reports

Every discovered issue must include:

- Title
- Severity
- Priority
- Steps to Reproduce
- Expected Result
- Actual Result
- Root Cause
- Suggested Fix
- Regression Risk

---

## Completion Criteria

A task is NOT complete until:

- Implementation is complete.
- Edge cases have been tested.
- API behavior has been verified.
- Failed APIs have been investigated.
- Root cause analysis has been documented.
- Regression testing has passed.
- Accessibility has been verified.
- Performance has been reviewed.
- User experience has been validated.
- Implementation Plan has been updated with testing results.

Never mark a task complete based only on successful compilation or passing unit tests.