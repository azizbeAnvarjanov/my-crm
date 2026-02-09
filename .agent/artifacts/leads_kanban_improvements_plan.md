# Leads Kanban Improvements Plan

## Talablar:

### 1. Pagination/Infinite Scroll ✅
- Har bir stage uchun 50 tadan lead yuklash
- Scroll qilganda keyingi 50 tani yuklash
- Supabase'da `.range()` ishlatish

### 2. Drag and Drop Tuzatish ✅
- Hozir drag and drop ishlamayapti
- DndContext va drag handler'larni tekshirish
- Lead'ni bir stage'dan boshqasiga ko'chirish

### 3. Sorting by updated_at ✅
- Eng uzoq update qilinmagan leadlar tepada
- ORDER BY updated_at ASC (eng qadimgi birinchi)

### 4. Lead Sheet ✅
- Lead'ga bosganda sheet ochilishi
- Sheet ichida:
  - Lead ma'lumotlari
  - Stage o'zgartirish select
  - Boshqa maydonlarni o'zgartirish

### 5. Scroll Progress Indicator ✅
- AmoCRM kabi scroll progress bar
- Har bir stage column uchun

## Implementation Steps:

### Step 1: useStageLeads Hook - Pagination
```typescript
export function useStageLeads(stageId: string, limit = 50, offset = 0) {
  // Fetch leads with pagination
  // ORDER BY updated_at ASC
  // LIMIT and OFFSET
}
```

### Step 2: Infinite Scroll in StageColumn
```typescript
// Add intersection observer
// Load more on scroll to bottom
// Merge new leads with existing
```

### Step 3: Fix Drag and Drop
```typescript
// Check handleDragEnd logic
// Ensure moveLead mutation works
// Update local state properly
```

### Step 4: Lead Sheet Component
```typescript
// Create LeadSheet component
// Add state for selected lead
// Form with all fields + stage select
```

### Step 5: Scroll Progress
```typescript
// Add progress bar to each column
// Calculate scroll percentage
// Show/hide based on scroll state
```

## Files to Modify:

1. `/src/hooks/use-pipeline.ts` - Add pagination hooks
2. `/src/app/(protected)/leads/[pipelineId]/page.tsx` - Main kanban page
3. `/src/components/lead-sheet.tsx` - New component for lead details sheet

## Current Status:
- [ ] Pagination implemented
- [ ] Sorting by updated_at 
- [ ] Drag and drop fixed
- [ ] Lead sheet created
- [ ] Scroll progress added
