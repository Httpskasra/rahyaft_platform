I’ll be straight with you: what you’re asking for is essentially a **workflow engine (multi-step approval system)**. If you hack it in randomly, it will become a nightmare very fast. So we’ll structure it clean from the start.

You said: *no docs, only code & file changes* → good. I’ll give you exactly what to add/change.

---

# ✅ BACKEND (NestJS + Prisma assumed)

## 1. 🔥 Prisma Schema Changes

Add these models:

```prisma
model Application {
  id          String   @id @default(uuid())
  title       String
  description String?
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])

  status      ApplicationStatus @default(PENDING)

  steps       ApprovalStep[]
  currentStep Int @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ApprovalStep {
  id            String   @id @default(uuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id])

  role          RoleType
  order         Int
  status        StepStatus @default(PENDING)

  approvedById  String?
  approvedBy    User? @relation(fields: [approvedById], references: [id])

  approvedAt    DateTime?

  createdAt     DateTime @default(now())
}

enum ApplicationStatus {
  PENDING
  IN_PROGRESS
  APPROVED
  REJECTED
}

enum StepStatus {
  PENDING
  APPROVED
  REJECTED
}

enum RoleType {
  HR
  CEO
  MANAGER
}
```

---

## 2. 🧠 Service Logic (core of system)

### `applications.service.ts`

```ts
async createApplication(dto: CreateApplicationDto, userId: string) {
  const app = await this.prisma.application.create({
    data: {
      title: dto.title,
      description: dto.description,
      createdById: userId,
      status: 'IN_PROGRESS',
      steps: {
        create: dto.approvalFlow.map((role, index) => ({
          role,
          order: index,
        })),
      },
    },
    include: { steps: true },
  });

  return app;
}
```

---

### 🔥 Approve Step (IMPORTANT)

```ts
async approve(applicationId: string, user: User) {
  const app = await this.prisma.application.findUnique({
    where: { id: applicationId },
    include: { steps: true },
  });

  const currentStep = app.steps.find(
    (s) => s.order === app.currentStep
  );

  if (!currentStep) throw new Error('No step found');

  if (currentStep.role !== user.role) {
    throw new Error('Not authorized for this step');
  }

  await this.prisma.approvalStep.update({
    where: { id: currentStep.id },
    data: {
      status: 'APPROVED',
      approvedById: user.id,
      approvedAt: new Date(),
    },
  });

  const nextStep = app.currentStep + 1;

  const isLast = nextStep >= app.steps.length;

  await this.prisma.application.update({
    where: { id: applicationId },
    data: {
      currentStep: nextStep,
      status: isLast ? 'APPROVED' : 'IN_PROGRESS',
    },
  });

  return { success: true };
}
```

---

### ❌ Reject

```ts
async reject(applicationId: string, user: User) {
  const app = await this.prisma.application.findUnique({
    where: { id: applicationId },
    include: { steps: true },
  });

  const currentStep = app.steps.find(
    (s) => s.order === app.currentStep
  );

  if (currentStep.role !== user.role) {
    throw new Error('Not allowed');
  }

  await this.prisma.approvalStep.update({
    where: { id: currentStep.id },
    data: {
      status: 'REJECTED',
      approvedById: user.id,
      approvedAt: new Date(),
    },
  });

  await this.prisma.application.update({
    where: { id: applicationId },
    data: {
      status: 'REJECTED',
    },
  });

  return { success: true };
}
```

---

## 3. 🎯 Controller

```ts
@Post()
create(@Body() dto: CreateApplicationDto, @Req() req) {
  return this.service.createApplication(dto, req.user.id);
}

@Post(':id/approve')
approve(@Param('id') id: string, @Req() req) {
  return this.service.approve(id, req.user);
}

@Post(':id/reject')
reject(@Param('id') id: string, @Req() req) {
  return this.service.reject(id, req.user);
}

@Get(':id')
getOne(@Param('id') id: string) {
  return this.service.getById(id);
}
```

---

## 4. DTO

```ts
export class CreateApplicationDto {
  title: string;
  description?: string;
  approvalFlow: RoleType[]; // ['HR','CEO']
}
```

---

# ✅ FRONTEND (Next.js)

## 1. 🔥 Create Application Page

```tsx
const [flow, setFlow] = useState<RoleType[]>([]);

const submit = async () => {
  await axios.post('/applications', {
    title,
    description,
    approvalFlow: flow,
  });
};
```

---

## 2. 🧠 Approval Timeline Component

```tsx
export const ApprovalTimeline = ({ steps }) => {
  return (
    <div>
      {steps.map((step) => (
        <div key={step.id} className="flex gap-2">
          <div>{step.role}</div>
          <div>{step.status}</div>
          {step.approvedBy && <div>{step.approvedBy.name}</div>}
        </div>
      ))}
    </div>
  );
};
```

---

## 3. 🎯 Application Details Page

```tsx
const { data } = useQuery(['app', id], () =>
  axios.get(`/applications/${id}`)
);

<ApprovalTimeline steps={data.steps} />

{data.currentStepRole === user.role && (
  <>
    <button onClick={() => approve(id)}>Approve</button>
    <button onClick={() => reject(id)}>Reject</button>
  </>
)}
```

---

## 4. 🔥 Approve / Reject API

```ts
const approve = (id: string) =>
  axios.post(`/applications/${id}/approve`);

const reject = (id: string) =>
  axios.post(`/applications/${id}/reject`);
```

---

# ⚠️ Critical Improvements (Don’t skip)

If you skip these, your system will break later:

### 1. Add index on order

```prisma
@@index([applicationId, order])
```

---

### 2. Always sort steps

```ts
steps: {
  orderBy: { order: 'asc' }
}
```

---

### 3. NEVER trust frontend for role

Always check:

```ts
if (currentStep.role !== user.role)
```

---

# 🧠 Reality Check

What you built before = CRUD app
What you're building now = **process system**

That means:

* state transitions matter
* order matters
* permissions matter

If you implement this clean → this becomes **enterprise-level feature**

If you rush → it becomes spaghetti in 2 weeks

---

If you want next level (worth it if you're serious):

* notifications (email/socket)
* audit logs
* parallel approvals (multiple roles same step)

Tell me if you want that — I’ll extend this into a full production-grade workflow system.
