# ATC Assistant Test Questions

## Purpose
Test real questions that SHOULD have answers based on actual knowledge base content to debug the response issues.

## Test Questions (Based on Actual KB Content)

### 1. Departure Procedures
**Question**: "What are the departure information requirements for controllers?"
**Expected**: Should find Chapter 3 Section 9 content about departure procedures

### 2. Same Runway Separation
**Question**: "What are the same runway separation requirements?"
**Expected**: Should find specific separation minima and procedures

### 3. Line Up and Wait
**Question**: "When can I use line up and wait procedures?"
**Expected**: Should find LUAW procedures and restrictions

### 4. IFR Takeoff Minimums
**Question**: "What are IFR takeoff minimums and obstacle procedures?"
**Expected**: Should find Chapter 4 Section 3 content about takeoff minimums

### 5. Intersecting Runway Operations
**Question**: "How do I handle intersecting runway operations?"
**Expected**: Should find Chapter 3 content about intersecting runways

### 6. Approach Clearances
**Question**: "What are the requirements for approach clearances?"
**Expected**: Should find approach procedure requirements

### 7. Traffic Separation
**Question**: "What are the basic traffic separation requirements?"
**Expected**: Should find separation minima procedures

### 8. Departure Control Instructions
**Question**: "What departure control instructions should I issue?"
**Expected**: Should find Chapter 3 departure control procedures

### 9. Ceiling and Visibility
**Question**: "What are the ceiling and visibility requirements?"
**Expected**: Should find Chapter 3 Section 10 weather minima

### 10. Aircraft Categories
**Question**: "How are aircraft categories defined for separation?"
**Expected**: Should find aircraft classification procedures

## Debug Questions (Should Have NO Answer)

### 11. Runway Incursions (Should Fail)
**Question**: "Explain runway incursion procedures"
**Expected**: Should correctly say no information found

### 12. Emergency Procedures (Should Fail)
**Question**: "What are aircraft emergency procedures?"
**Expected**: Should correctly say no information found (if not in KB)

## Issues to Check
1. **Wake turbulence appearing everywhere** - Check if hardcoded or cache issue
2. **Sources showing with no response** - Debug the response generation
3. **Overdesigned sources** - Simplify the display
4. **Response timing** - Fix the disconnect between search and response

## Expected Behavior
- Questions 1-10: Should get REAL answers with relevant FAA procedures
- Questions 11-12: Should correctly say no information found
- Sources should only show when there's an actual response
- No wake turbulence content unless specifically asked