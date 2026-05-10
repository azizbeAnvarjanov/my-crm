# Dashboard React Native Spec

## Maqsad

Bu hujjat `src/app/(protected)/dashboard/page.tsx` dagi `DashboardPage` ni React Native ekran sifatida qayta yozish uchun tayyorlangan analiz va blueprint.

Scope faqat `dashboard` ekrani:

- header va filterlar
- statistic kartalar
- top callers
- leads trend
- employee conversion
- leads by stage
- tasks distribution

Scope ichiga kirmaydi:

- sidebar
- auth
- boshqa sahifalar
- global navigation

## Asosiy bog'liqliklar

`DashboardPage` quyidagi manbalarga tayanadi:

- `useBranch()` dan `selectedBranch`
- `useTheme()` dan `theme`
- `usePipelines(branchId)`
- `useDashboardStats(activePipelineId, dateRange)`
- `useLeadsByStage(activePipelineId)`
- `useEmployeeConversion(activeConversionStageId)`
- `useLeadsTrend(trendPeriod, activePipelineId)`
- `useTopCallers(branchId, dateRange)`

RN versiyada ham shu business logic saqlab qolinsa, ekran parity bo'ladi.

## Ekran tuzilmasi

Render tartibi:

1. Header
2. Pipeline filter
3. Date period filter
4. Custom date inputlar (`datePeriod === "custom"`)
5. Active date range badge
6. 4 ta stats card
7. Top callers section
8. Leads trend section
9. 3 ta analytics section:
   - employee conversion
   - leads by stage
   - task distribution

RN uchun tavsiya qilingan asosiy skelet:

```text
DashboardScreen
\- ScrollView
   |- DashboardHeader
   |- DashboardFilters
   |- StatsGrid
   |- TopCallersSection
   |- LeadsTrendSection
   |- EmployeeConversionSection
   |- LeadsByStageSection
   \- TaskDistributionSection
```

## State va derived state

Web sahifadagi local state:

```ts
selectedPipelineId: string
conversionStageId: string
trendPeriod: "day" | "week" | "month" | "year"
datePeriod: "all" | "last7" | "last30" | "current_month" | "last_month" | "custom"
customStartDate: string
customEndDate: string
```

Derived state:

- `branchId = selectedBranch?.id`
- `activePipelineId`
- `dateRange`
- `activeConversionStageId`
- `hasPipelines`
- `hasActivePipeline`
- `showPipelineEmptyState`
- `pipelinePending`
- `isRefreshing`
- section-level loader flaglar
- `taskData`

## Date range logikasi

`dateRange` `useMemo` bilan hisoblanadi:

- `all` => `undefined`
- `last7` => bugundan 6 kun orqaga
- `last30` => bugundan 29 kun orqaga
- `current_month` => joriy oyning 1-kunidan oxirigacha
- `last_month` => oldingi oyning 1-kunidan oxirigacha
- `custom` => `customStartDate` va `customEndDate` to'liq bo'lsa

RN implementationda bu logikani alohida helperga chiqarish qulay:

```ts
function buildDashboardDateRange(
  datePeriod,
  customStartDate,
  customEndDate,
) => DashboardDateRange | undefined
```

## Data contractlar

### DashboardStats

```ts
interface DashboardStats {
  total_leads: number
  unassigned_leads: number
  leads_today: number
  leads_week: number
  leads_month: number
  leads_year: number
  updated_today: number
  updated_week: number
  updated_month: number
  total_tasks: number
  completed_tasks: number
  pending_tasks: number
  overdue_tasks: number
  today_tasks: number
  upcoming_tasks: number
  total_calls: number
  calls_today: number
  calls_week: number
}
```

### LeadsByStage

```ts
interface LeadsByStage {
  stage_id: string
  stage_name: string
  count: number
  percentage: number
}
```

### EmployeeConversion

```ts
interface EmployeeConversion {
  employee_id: string
  employee_name: string
  total_leads: number
  converted_leads: number
  conversion_rate: number
}
```

### LeadsTrend

```ts
interface LeadsTrend {
  date: string
  count: number
  label: string
}
```

### TopCaller

```ts
interface TopCaller {
  employee_id: string
  employee_name: string
  call_count: number
}
```

## UI bo'limlari tafsiloti

### 1. Header

Ko'rsatadi:

- dashboard icon
- `Dashboard` title
- branch name
- `isRefreshing` bo'lsa spinner

RN mapping:

- `View`
- `Text`
- icon komponent
- `ActivityIndicator`

### 2. Pipeline filter

Manba:

- `usePipelines(branchId)`

Qoidalar:

- agar `selectedPipelineId` pipeline list ichida bo'lsa, o'sha active
- aks holda birinchi pipeline default bo'ladi
- pipeline yo'q bo'lsa empty state ishlaydi

RN mapping:

- `Pressable` + bottom sheet
- yoki native `Modal` ichida list

### 3. Date filter

Variantlar:

- `all`
- `last7`
- `last30`
- `current_month`
- `last_month`
- `custom`

`custom` bo'lsa:

- start date input
- end date input

RN mapping:

- chips yoki segmented selector
- custom date uchun date picker modal

### 4. Stats cards

4 ta asosiy karta:

1. `Jami Lidlar`
2. `Eslatmalar`
3. `Qo'ng'iroqlar`
4. `Yangilangan`

#### Jami Lidlar

Ko'rsatadi:

- `stats.total_leads`
- `leads_today`
- `leads_week`
- `leads_month`
- `leads_year`
- agar `unassigned_leads > 0` bo'lsa alert badge

#### Eslatmalar

Ko'rsatadi:

- `stats.total_tasks`
- `completed_tasks`
- `pending_tasks`
- `overdue_tasks`

#### Qo'ng'iroqlar

Ko'rsatadi:

- `stats.total_calls`
- `calls_today`
- `calls_week`

#### Yangilangan

Ko'rsatadi:

- `stats.updated_today`
- `updated_today`
- `updated_week`
- `updated_month`

RN layout tavsiya:

- telefonlarda 2 ustunli grid
- planshetlarda 4 ustun yoki 2x2 responsive grid

### 5. Top callers

Manba:

- `useTopCallers(branchId, dateRange)`

Holatlar:

- loading
- data bor
- empty

Data bo'lsa:

- top 5 xodim
- `call_count`
- `employee_name`
- rank badge

RN layout tavsiya:

- 2 ustunli kartalar
- yoki gorizontal `FlatList`

### 6. Leads trend

Manba:

- `useLeadsTrend(trendPeriod, activePipelineId)`

Trend tablari:

- `day`
- `week`
- `month`
- `year`

Holatlar:

- pipeline empty
- loading
- chart
- no data

RN mapping:

- segment control yoki chip row
- line/area chart uchun RN chart library

Kerak bo'ladigan chart data:

```ts
[
  { label: "Mon", count: 5 },
  { label: "Tue", count: 8 }
]
```

### 7. Employee conversion

Manba:

- `useLeadsByStage(activePipelineId)` dan stage list
- `useEmployeeConversion(activeConversionStageId)`

Flow:

1. user stage tanlaydi
2. `activeConversionStageId` aniqlanadi
3. conversion data yuklanadi
4. top 10 employee progress list ko'rsatiladi

Har item:

- rank
- employee name
- `conversion_rate.toFixed(1) + "%"`
- progress bar

RN mapping:

- picker/bottom sheet
- `ScrollView` yoki `FlatList`
- custom progress bar

### 8. Leads by stage

Manba:

- `useLeadsByStage(activePipelineId)`

Holatlar:

- pipeline empty
- loading
- chart
- no data

Chart ma'nosi:

- har stage uchun `count`
- label `stage_name`

RN mapping:

- horizontal bar chart
- agar chart kutubxonasi ishlatilmasa, custom progress rows ham mumkin

### 9. Task distribution

Manba:

- `stats.completed_tasks`
- `stats.pending_tasks`
- `stats.overdue_tasks`

Web sahifada `taskData` shu tarzda tayyorlanadi:

```ts
const taskData = [
  { name: "Bajarilgan", value: stats?.completed_tasks || 0, color: "#10b981" },
  { name: "Kutilmoqda", value: stats?.pending_tasks || 0, color: "#f59e0b" },
  { name: "Muddati o'tgan", value: stats?.overdue_tasks || 0, color: "#ef4444" },
].filter((item) => item.value > 0)
```

Holatlar:

- pipeline empty
- loading
- donut chart
- empty

RN mapping:

- pie/donut chart
- markazida `stats.total_tasks`

## Loading va empty state qoidalari

### Global refresh

`isRefreshing` quyidagilardan biri `isFetching` bo'lsa `true`:

- stats
- stages
- employees
- trend
- callers

Header ichida kichik spinner ko'rsatiladi.

### Stats skeleton

`showStatsSkeleton`:

- pipeline empty emas
- active pipeline yo'q yoki stats first load

### Trend loader

`showTrendLoader`:

- pipeline empty emas
- active pipeline yo'q yoki trend first load

### Stage loader

`showStagesLoader`:

- pipeline empty emas
- active pipeline yo'q yoki stage first load

### Conversion loader

`showConversionLoader`:

- active pipeline bor
- stage tanlangan
- employees loading
- employeeConversion hali yo'q

### Top callers loader

`showTopCallersLoader`:

- branch yo'q yoki callers loading
- va `topCallers` hali yo'q

RN versiyada bularni aynan shu shart bilan ko'chirsangiz parity yuqori bo'ladi.

## Web -> React Native mapping

| Web | RN |
|---|---|
| `div`, `Card` | `View` |
| `CardHeader`, `CardContent` | `View` bloklari |
| `Select` | `Modal`, `BottomSheet`, custom picker |
| `Tabs` | segmented control, chips |
| `Input type="date"` | date picker |
| `Skeleton` | shimmer yoki placeholder blok |
| `ResponsiveContainer + Recharts` | RN chart kutubxonasi yoki custom chart |
| CSS grid | `View` + `flexDirection: "row"` + `flexWrap` |
| hover states | olib tashlanadi |

## Tavsiya etilgan RN component tree

```ts
DashboardScreen
  DashboardHeader
  DashboardFilters
  StatsGrid
    StatsCardLead
    StatsCardTasks
    StatsCardCalls
    StatsCardUpdated
  TopCallersSection
  LeadsTrendSection
  EmployeeConversionSection
  LeadsByStageSection
  TaskDistributionSection
```

## Tavsiya etilgan props va helperlar

```ts
type TrendPeriod = "day" | "week" | "month" | "year"
type DatePeriod =
  | "all"
  | "last7"
  | "last30"
  | "current_month"
  | "last_month"
  | "custom"

interface DashboardDateRange {
  startDate: string
  endDate: string
}
```

Foydali helperlar:

- `buildDashboardDateRange`
- `getActivePipelineId`
- `getActiveConversionStageId`
- `buildTaskData`
- `formatCompactNumber`

## React Native implementatsiya ketma-ketligi

1. Branch context yoki `selectedBranch` source tayyorlash
2. Pipeline picker ulash
3. Date period state va helper yozish
4. 4 ta stats card chiqarish
5. Top callers section qo'shish
6. Trend section qo'shish
7. Conversion section qo'shish
8. Leads by stage section qo'shish
9. Task distribution section qo'shish
10. Loader va empty statelarni web bilan bir xil qilish

## Muhim parity eslatmalari

### 1. `useLeadsTrend` `dateRange` ni ishlatmaydi

Trend faqat:

- `trendPeriod`
- `activePipelineId`

ga bog'liq. Date filter trend chartga ta'sir qilmaydi.

### 2. `useLeadsByStage` ham `dateRange` ni ishlatmaydi

Stage distribution doim pipeline bo'yicha umumiy ko'rinish beradi.

### 3. `useTopCallers` pipeline emas, branch bo'yicha ishlaydi

Top callers:

- `branchId`
- `dateRange`

ga bog'liq.

### 4. `total_leads` date filter bilan qisqarmaydi

`useDashboardStats` ichida `total_leads` pipeline bo'yicha jami sonni beradi.
Lekin `leads_today`, `leads_week`, `leads_month`, `leads_year` dateRange bilan kesishadi.

Bu web'dagi hozirgi behavior. RN'da aynan shu parity kerak bo'lsa, shu holatni saqlang.

### 5. Employee conversion pipeline bo'yicha emas

`useEmployeeConversion(conversionStageId)` ichida employee'larning `total_leads` qiymati barcha leadlar bo'yicha hisoblanadi.
Faqat `converted_leads` tanlangan `stage_id` orqali aniqlanadi.

Bu ham hozirgi web behavior.

## RN uchun qisqa pseudo-flow

```ts
const { selectedBranch } = useBranch()
const branchId = selectedBranch?.id ?? null

const [selectedPipelineId, setSelectedPipelineId] = useState("")
const [conversionStageId, setConversionStageId] = useState("")
const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("month")
const [datePeriod, setDatePeriod] = useState<DatePeriod>("all")
const [customStartDate, setCustomStartDate] = useState("")
const [customEndDate, setCustomEndDate] = useState("")

const dateRange = buildDashboardDateRange(datePeriod, customStartDate, customEndDate)
const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines(branchId)
const activePipelineId = getActivePipelineId(pipelines, selectedPipelineId)

const statsQuery = useDashboardStats(activePipelineId, dateRange)
const stagesQuery = useLeadsByStage(activePipelineId)
const activeConversionStageId = getActiveConversionStageId(
  conversionStageId,
  stagesQuery.data,
)
const conversionQuery = useEmployeeConversion(activeConversionStageId)
const trendQuery = useLeadsTrend(trendPeriod, activePipelineId)
const callersQuery = useTopCallers(branchId, dateRange)
```

## Yakuniy xulosa

RN ekran uchun eng muhim narsa:

- branch -> pipeline -> stats flow
- date filter logikasi
- section-level loading va empty statelar
- 4 ta stats card + 4 ta analytics block paritysi

Agar keyingi bosqichda RN `DashboardScreen.tsx` yozilsa, shu hujjatdagi component tree va state oqimi bo'yicha to'g'ridan-to'g'ri implement qilish mumkin.
