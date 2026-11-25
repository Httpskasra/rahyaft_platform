--
-- PostgreSQL database dump
--

\restrict PbJ5uphmE2MUqCnZBbh0W1Bj8Fr5fBGoxzeOqFINhrlluAYlwc2FwowcXSmpqIp

-- Dumped from database version 16.12 (Debian 16.12-1.pgdg13+1)
-- Dumped by pg_dump version 16.12 (Debian 16.12-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ApprovalStatus; Type: TYPE; Schema: public; Owner: app
--

CREATE TYPE public."ApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."ApprovalStatus" OWNER TO app;

--
-- Name: DepartmentRelationType; Type: TYPE; Schema: public; Owner: app
--

CREATE TYPE public."DepartmentRelationType" AS ENUM (
    'SUPPORTS',
    'COLLABORATES',
    'AUDITS',
    'SERVES'
);


ALTER TYPE public."DepartmentRelationType" OWNER TO app;

--
-- Name: Gender; Type: TYPE; Schema: public; Owner: app
--

CREATE TYPE public."Gender" AS ENUM (
    'MALE',
    'FEMALE'
);


ALTER TYPE public."Gender" OWNER TO app;

--
-- Name: OccupationGroup; Type: TYPE; Schema: public; Owner: app
--

CREATE TYPE public."OccupationGroup" AS ENUM (
    'HAIR_TRANSPLANT_TECHNICIAN',
    'NAIL_TECHNICIAN',
    'GENERAL_PRACTITIONER',
    'PHYSICIAN',
    'HAIR_BEAUTY_CLINIC',
    'HOME_DEVICE_CUSTOMER',
    'BARBER',
    'DENTIST',
    'VETERINARIAN',
    'COLLEAGUE',
    'EMPLOYEE',
    'DERMATOLOGIST',
    'GYNECOLOGIST',
    'OTHER'
);


ALTER TYPE public."OccupationGroup" OWNER TO app;

--
-- Name: RepairStatus; Type: TYPE; Schema: public; Owner: app
--

CREATE TYPE public."RepairStatus" AS ENUM (
    'REGISTERED',
    'WAITING_REVIEW',
    'WAITING_COST_APPROVAL',
    'APPROVED',
    'REJECTED',
    'IN_REPAIR',
    'QC',
    'READY_FOR_DELIVERY',
    'DELIVERED',
    'CLOSED',
    'CANCELED',
    'NO_REPAIR_REQUIRED'
);


ALTER TYPE public."RepairStatus" OWNER TO app;

--
-- Name: RepairType; Type: TYPE; Schema: public; Owner: app
--

CREATE TYPE public."RepairType" AS ENUM (
    'IN_HOUSE',
    'ON_SITE'
);


ALTER TYPE public."RepairType" OWNER TO app;

--
-- Name: ScopeType; Type: TYPE; Schema: public; Owner: app
--

CREATE TYPE public."ScopeType" AS ENUM (
    'SELF',
    'TEAM',
    'DEPARTMENT',
    'DEPARTMENT_SUBTREE',
    'RELATED_DEPARTMENTS',
    'ORG_WIDE'
);


ALTER TYPE public."ScopeType" OWNER TO app;

--
-- Name: VisitResult; Type: TYPE; Schema: public; Owner: app
--

CREATE TYPE public."VisitResult" AS ENUM (
    'REPAIRED',
    'NEED_SECOND_VISIT',
    'NEED_PART',
    'CUSTOMER_ABSENT',
    'CANCELED'
);


ALTER TYPE public."VisitResult" OWNER TO app;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ApprovalAction; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."ApprovalAction" (
    id text NOT NULL,
    "instanceId" text NOT NULL,
    "stepId" text NOT NULL,
    "approverId" text NOT NULL,
    action public."ApprovalStatus" NOT NULL,
    comments text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ApprovalAction" OWNER TO app;

--
-- Name: ApprovalInstance; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."ApprovalInstance" (
    id text NOT NULL,
    "submissionId" text NOT NULL,
    status public."ApprovalStatus" DEFAULT 'PENDING'::public."ApprovalStatus" NOT NULL,
    "currentStepOrder" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ApprovalInstance" OWNER TO app;

--
-- Name: ApprovalPolicy; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."ApprovalPolicy" (
    id text NOT NULL,
    "formId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ApprovalPolicy" OWNER TO app;

--
-- Name: ApprovalStep; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."ApprovalStep" (
    id text NOT NULL,
    "policyId" text NOT NULL,
    "stepOrder" integer NOT NULL,
    "roleId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ApprovalStep" OWNER TO app;

--
-- Name: Attendance; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."Attendance" (
    id text NOT NULL,
    "userId" text NOT NULL,
    date date NOT NULL,
    "checkTime" timestamp(3) without time zone NOT NULL,
    source text DEFAULT 'excel-import'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Attendance" OWNER TO app;

--
-- Name: Customer; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."Customer" (
    id text NOT NULL,
    "nationalCode" text NOT NULL,
    address text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "birthDate" text NOT NULL,
    city text NOT NULL,
    email text,
    "firstName" text NOT NULL,
    gender public."Gender" NOT NULL,
    "lastName" text NOT NULL,
    mobile text NOT NULL,
    occupation text NOT NULL,
    "occupationGroup" public."OccupationGroup" NOT NULL,
    phone text NOT NULL,
    "postalCode" text,
    province text NOT NULL,
    "registeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Customer" OWNER TO app;

--
-- Name: Department; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."Department" (
    id text NOT NULL,
    name text NOT NULL,
    "parentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Department" OWNER TO app;

--
-- Name: DepartmentRelation; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."DepartmentRelation" (
    id text NOT NULL,
    "fromDepartmentId" text NOT NULL,
    "toDepartmentId" text NOT NULL,
    type public."DepartmentRelationType" NOT NULL
);


ALTER TABLE public."DepartmentRelation" OWNER TO app;

--
-- Name: Form; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."Form" (
    id text NOT NULL,
    "ownerId" text NOT NULL,
    name text NOT NULL,
    description text,
    schema jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Form" OWNER TO app;

--
-- Name: FormAnalysis; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."FormAnalysis" (
    id text NOT NULL,
    "formId" text NOT NULL,
    "fieldId" text,
    metric text NOT NULL,
    value jsonb NOT NULL,
    source text DEFAULT 'analytics-worker'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FormAnalysis" OWNER TO app;

--
-- Name: FormStat; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."FormStat" (
    id text NOT NULL,
    "formId" text NOT NULL,
    "fieldId" text NOT NULL,
    metric text NOT NULL,
    value jsonb NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FormStat" OWNER TO app;

--
-- Name: FormSubmission; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."FormSubmission" (
    id text NOT NULL,
    "formId" text NOT NULL,
    "formVersion" integer NOT NULL,
    "userId" text,
    data jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."FormSubmission" OWNER TO app;

--
-- Name: NotificationEvent; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."NotificationEvent" (
    id text NOT NULL,
    "repairCaseId" text NOT NULL,
    status public."RepairStatus" NOT NULL,
    payload jsonb NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."NotificationEvent" OWNER TO app;

--
-- Name: Permission; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."Permission" (
    id text NOT NULL,
    action text NOT NULL,
    resource text NOT NULL
);


ALTER TABLE public."Permission" OWNER TO app;

--
-- Name: Relative; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."Relative" (
    id text NOT NULL,
    "userInfoId" text NOT NULL,
    name text NOT NULL,
    relation text NOT NULL,
    address text,
    phone text
);


ALTER TABLE public."Relative" OWNER TO app;

--
-- Name: RepairCase; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."RepairCase" (
    id text NOT NULL,
    "caseNumber" text NOT NULL,
    "customerId" text NOT NULL,
    type public."RepairType" NOT NULL,
    status public."RepairStatus" NOT NULL,
    "technicianId" text,
    description text,
    "needCostApproval" boolean DEFAULT false NOT NULL,
    "estimatedCost" numeric(12,2),
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deviceTitle" text NOT NULL,
    "serialNumber" text,
    "problemDescription" text NOT NULL
);


ALTER TABLE public."RepairCase" OWNER TO app;

--
-- Name: RepairItem; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."RepairItem" (
    id text NOT NULL,
    "repairCaseId" text NOT NULL,
    title text NOT NULL,
    quantity integer NOT NULL,
    "unitPrice" numeric(12,2) NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RepairItem" OWNER TO app;

--
-- Name: RepairSla; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."RepairSla" (
    id text NOT NULL,
    "repairCaseId" text NOT NULL,
    "dueAt" timestamp(3) without time zone NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "isBreached" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."RepairSla" OWNER TO app;

--
-- Name: RepairStatusLog; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."RepairStatusLog" (
    id text NOT NULL,
    "repairCaseId" text NOT NULL,
    "oldStatus" public."RepairStatus",
    "newStatus" public."RepairStatus" NOT NULL,
    "changedById" text NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RepairStatusLog" OWNER TO app;

--
-- Name: RepairVisit; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."RepairVisit" (
    id text NOT NULL,
    "repairCaseId" text NOT NULL,
    "technicianId" text NOT NULL,
    "scheduledAt" timestamp(3) without time zone NOT NULL,
    "visitedAt" timestamp(3) without time zone,
    notes text,
    result public."VisitResult" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RepairVisit" OWNER TO app;

--
-- Name: Role; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Role" OWNER TO app;

--
-- Name: RolePermission; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."RolePermission" (
    id text NOT NULL,
    "roleId" text NOT NULL,
    "permissionId" text NOT NULL,
    scope public."ScopeType" NOT NULL,
    "relationType" public."DepartmentRelationType",
    constraints jsonb
);


ALTER TABLE public."RolePermission" OWNER TO app;

--
-- Name: User; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    "departmentId" text NOT NULL,
    "managerId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "refreshToken" text,
    "phoneNumber" text NOT NULL,
    "baleChatId" text,
    "employeeCode" text
);


ALTER TABLE public."User" OWNER TO app;

--
-- Name: UserInfo; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."UserInfo" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "firstName" text,
    "lastName" text,
    "fatherName" text,
    "birthDate" text,
    "nationalCode" text,
    "birthPlace" text,
    residence text,
    mobile text,
    "homePhone" text,
    degree text,
    university text,
    "graduateYear" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UserInfo" OWNER TO app;

--
-- Name: UserRole; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public."UserRole" (
    "userId" text NOT NULL,
    "roleId" text NOT NULL
);


ALTER TABLE public."UserRole" OWNER TO app;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: app
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO app;

--
-- Data for Name: ApprovalAction; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."ApprovalAction" (id, "instanceId", "stepId", "approverId", action, comments, "createdAt") FROM stdin;
\.


--
-- Data for Name: ApprovalInstance; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."ApprovalInstance" (id, "submissionId", status, "currentStepOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ApprovalPolicy; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."ApprovalPolicy" (id, "formId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ApprovalStep; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."ApprovalStep" (id, "policyId", "stepOrder", "roleId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Attendance; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."Attendance" (id, "userId", date, "checkTime", source, "createdAt") FROM stdin;
\.


--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."Customer" (id, "nationalCode", address, "createdAt", "updatedAt", "birthDate", city, email, "firstName", gender, "lastName", mobile, occupation, "occupationGroup", phone, "postalCode", province, "registeredAt") FROM stdin;
5266f071-4a73-4e07-b2df-fad6baf9d4e6	1234567890	خیابان ولیعصر پلاک ۱	2026-07-01 13:15:51.964	2026-07-01 13:15:51.964	1370/01/01	تهران	\N	علی	MALE	محمدی	09123456789	پزشک	PHYSICIAN	02112345678	\N	تهران	2026-07-01 13:15:51.964
\.


--
-- Data for Name: Department; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."Department" (id, name, "parentId", "createdAt") FROM stdin;
seed-dept-id	HQ	\N	2026-05-13 07:56:23.469
00000000-0000-4000-8000-000000000001	مدیریت کل	\N	2026-11-25 15:39:07.395
\.


--
-- Data for Name: DepartmentRelation; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."DepartmentRelation" (id, "fromDepartmentId", "toDepartmentId", type) FROM stdin;
\.


--
-- Data for Name: Form; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."Form" (id, "ownerId", name, description, schema, version, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FormAnalysis; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."FormAnalysis" (id, "formId", "fieldId", metric, value, source, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FormStat; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."FormStat" (id, "formId", "fieldId", metric, value, "updatedAt") FROM stdin;
\.


--
-- Data for Name: FormSubmission; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."FormSubmission" (id, "formId", "formVersion", "userId", data, "createdAt") FROM stdin;
\.


--
-- Data for Name: NotificationEvent; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."NotificationEvent" (id, "repairCaseId", status, payload, "sentAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."Permission" (id, action, resource) FROM stdin;
948dab38-2830-4597-87b9-64f13c611c35	create	users
c2ee5cce-4d4f-460f-b3e1-5b4a77a7ed67	create	roles
5b2b70b1-71ed-471c-b5dc-12de95865ecf	create	departments
3587e87e-f34d-4b64-9f9d-d97b7926acee	create	forms
908de14d-af74-4a81-b4e3-2dfd3ef1c08c	create	form-submissions
7c7becee-5ec0-40f9-a8a0-b78c9e350c17	create	user-info
ec21cf32-2c88-44b4-9ba6-e26944867ab0	read	users
f2e53a93-cf3a-403c-b129-468913c15ce9	read	roles
197518ea-4013-4735-a578-bccee46de572	read	departments
55d4986f-99cf-459f-916a-c1ed5f24326b	read	forms
d760e9d0-402a-48f6-8461-fc6a30672171	read	form-submissions
1c261cd4-8670-4411-8273-ee3ae1e8d71b	read	user-info
db36709d-c6fb-42c3-a3c7-a224129fddb7	update	users
3faaeff6-0dfa-42c4-929c-354a4d5cf14d	update	roles
3a55b472-fc8e-43fe-bdf7-3724c0579de3	update	departments
4b6f4b3d-d55b-4560-b690-fe56e5917904	update	forms
62c2b8c7-0098-428a-a6c1-eaea8400ac2c	update	form-submissions
9a259d8f-48d0-4fa4-8f52-343b3e35e00a	update	user-info
c25744e8-b1b4-44d7-91c9-c9576ef4c7af	delete	users
c146ae9a-6d08-416f-95d4-fa73e1ebfc12	delete	roles
e358cf9e-d510-4b07-aed4-73d027a74e19	delete	departments
3bf968d5-c674-4c95-a472-7895915d209e	delete	forms
4e43cdf5-e636-4afd-b8c3-7a166e885657	delete	form-submissions
540dd0bf-269e-4366-93dd-f3e2182f8092	delete	user-info
e9069382-0df0-46af-92dd-0c26436f97bf	create	approvals
9f1d6897-d0da-4a05-bc0d-e9dd0249e41a	read	approvals
e8e9fe27-88fd-425a-8473-39cade4eb6cc	update	approvals
9f73b332-7093-4c77-82a1-866f02f76667	delete	approvals
3ffb84bd-2eb4-4159-a6f6-5c9d867ee27a	approve	users
83a1f75e-f220-4b90-b120-a5b75d06ea02	approve	roles
939d428a-2efe-48fe-91be-9d2c8ce08d11	approve	departments
7a99641e-6049-4882-9913-2e79885bffac	approve	forms
6aa68a1d-c52d-4ceb-b66f-132b8e3e795d	approve	form-submissions
5fea78cb-1775-4476-864a-02cbec6a8704	approve	approvals
20553c0b-2ce1-4700-87b2-a2b3cf0bca77	approve	user-info
59598bb4-ce04-4109-b77b-53293ad046fd	assign	roles
1ca6fd34-8b83-4812-9fa4-69a3916fc422	read	attendance
fd22bcfd-189b-47e8-99bf-c1f6a2eeb743	create	attendance
f67e7357-3f67-434d-a432-6bf658408177	read	customers
9e109826-1900-42c6-8d70-0c6a6c45cbe7	create	customers
f5c09e44-44ba-4fe8-b172-3aa3a5f581c5	update	customers
69e87fdf-b9eb-44dd-bf9d-d357a59746ea	delete	customers
a179f7fd-c02b-4032-96bb-8fb033f1145c	manage-contacts	customers
021b8071-73b0-443e-a584-cc7acf66b1c4	manage-opportunities	customers
a08b53df-673c-4fea-8e8f-79f6d4887fab	log-activity	customers
ea029215-33d9-455f-b284-b44471c0bcc8	analyze	customers
e9cb2dac-b7bd-4cbd-a406-40f06258236f	read	repairs
f32b35d5-0c07-4238-9402-f7d46370254e	create	repairs
798a0a24-22cc-4396-8041-f4edc5c81e75	update	repairs
2ad0e63f-e91b-4ae4-9412-85ced181d023	assign	repairs
e3295868-ff79-4179-b220-d25db77aa8c9	read	communication
667fbad9-25df-4520-95c5-50b5f8a5c2a5	create	communication
cbc091eb-3f82-4697-85fe-1fcf53ce89da	update	communication
03d0c770-5725-4b2d-a9a9-9d1d417f13ed	read	production-flows
c831d055-8bd9-4f6c-a157-08fe5017168d	create	production-flows
38bafe29-5935-4d2f-b2b4-a921ef42ca02	update	production-flows
5ce6a39a-630b-4501-87e4-a72d5e9a411d	delete	production-flows
eedf8420-cd03-4d25-9d0e-eed7ae3d84f7	read	production-runs
5ab87176-be4d-43ac-ad68-80c4a25b6e56	create	production-runs
ceb85a2d-3e04-4bb2-a2b0-d6d1265cf0aa	update	production-runs
b7644d39-6837-40ed-87bb-09b65dfcd2a7	execute	production-runs
836c4e29-c7cf-47df-bfe1-aa429fb056a7	supervise	production-runs
879c7002-c426-4cb0-9ccd-115e95843ddc	approve	production-runs
ae918382-e3e9-4681-a049-d9d43a21f83b	qc	production-runs
9ec08189-70b5-44a0-8d89-11a8a384b95b	read	recruitment-applications
ba086fca-3112-43e1-8063-c03d1e5bb826	review-initial	recruitment-applications
0cd4017b-07cd-454f-aea0-c444ddd7b696	conduct-initial-interview	recruitment-applications
6ab15c25-1723-488a-8fea-a66886e04039	assign-technical-interviewer	recruitment-applications
69aecef4-a6ff-48be-bf96-da6251043cb0	final-approve	recruitment-applications
edf13a39-cac6-4ea2-9666-e119074ee2c6	conduct-technical-interview	recruitment-interviews
1837045a-fe7a-4b1c-b134-ad2c4b9eeefd	manage	recruitment-settings
663199a2-e25f-446a-bacf-8865e32cf6b7	read	suppliers
8c2c734a-8081-42cd-be63-85ef05848cc5	create	suppliers
a7866c66-70ae-4280-aa34-674b4d6c49c8	update	suppliers
81e844cb-a3ec-4882-a8eb-6133fee70a0f	delete	suppliers
4cc2977d-654a-4b26-b1a4-97930b4698a2	read	supplier-evaluations
ee8c7610-f46c-4152-a5bb-e44854e28e60	create	supplier-evaluations
2abbedfa-a1ee-435f-ab16-d5bb84af920e	manage-templates	supplier-evaluations
0de13645-6758-462d-92ea-830891583378	manage-settings	supplier-evaluations
1afba19c-153d-4dd9-b67b-45a8e8dcd6ce	read	products
afdfeb54-77e1-4364-a09e-fb4c8ada088d	create	products
525343df-f25e-4287-8b52-a914f4dbdb14	update	products
536130ae-d841-4be7-8b73-79bfa8476672	delete	products
16dfad59-2ef2-4f8a-ace4-bb3e258338e4	manage	product-codes
604c3a4f-ab46-4710-853b-14c2ed0c300a	read	pricing
510445b3-5180-419b-a3ed-8fdc93d9daf4	approve	pricing
4f0dc5ae-dcb6-4642-a119-e182f14abf26	manage-settings	pricing
430de00e-810a-4170-b07d-64cd4e56cbe8	read	purchase-requests
92dced1e-4df2-4a3c-aee4-8e2ed338195b	approve	purchase-requests
d548b74b-e171-463f-8593-f949d7564983	read	purchase-orders
71052158-40eb-49de-ac29-c55f49a618f3	create	purchase-orders
daa12e14-23ce-4e8c-b6bd-c764a5e6d460	update	purchase-orders
77ded01b-4ad3-4a13-8c60-fc9a69e1cc80	read	warehouses
b8ff4e49-82c3-49d6-a530-080fcb64d5a5	create	warehouses
ed354f2f-1936-4554-ac71-49d4b012acb3	update	warehouses
21e14bdf-4782-497a-8c7e-ffeb9c40496c	delete	warehouses
774b2098-64ff-426f-aa26-303d88e0b0bb	manage	warehouses
993c720f-9477-44ab-8537-98017e64e01d	read	warehouse-receipts
b996b09b-f88d-4c0f-aea9-848593f67ad6	create	warehouse-receipts
fd5c6402-fc7f-4580-8c76-65119ef71427	read	warehouse-transfers
c4f7e8ed-f18e-4200-bf28-12c2311cf12c	create	warehouse-transfers
b5f4e564-084e-4793-963e-0b3452efc3b6	approve	warehouse-transfers
f4714039-55f5-40fc-bc6c-038ddc38aaa1	receive	warehouse-transfers
6035a830-bd84-4f46-9eac-c1f07a06a27e	read	warehouse-outbound
4efec012-e831-4f93-aff8-e7ad9972d12d	create	warehouse-outbound
c06a5c9f-b0b7-4624-924f-da6d34287b15	allocate	warehouse-outbound
8f5b746c-c21b-458e-b3c2-f50185ce6f1c	process	warehouse-outbound
a1bbf622-1509-4f4f-9213-ac61955778b5	read	stocktakes
42f0f226-bbf3-49a5-8c1f-f5f7cfcb5741	manage	stocktakes
88c70f82-1cd2-400d-871c-b99a6ac24288	count	stocktakes
\.


--
-- Data for Name: Relative; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."Relative" (id, "userInfoId", name, relation, address, phone) FROM stdin;
25ef944f-beb6-4774-9cad-ea5f4b5d3fac	bdb58777-be19-4d42-971d-9ee48dba8006	حسن محمدی	پدر	تهران	09129876543
\.


--
-- Data for Name: RepairCase; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."RepairCase" (id, "caseNumber", "customerId", type, status, "technicianId", description, "needCostApproval", "estimatedCost", "startedAt", "completedAt", "createdAt", "updatedAt", "deviceTitle", "serialNumber", "problemDescription") FROM stdin;
\.


--
-- Data for Name: RepairItem; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."RepairItem" (id, "repairCaseId", title, quantity, "unitPrice", description, "createdAt") FROM stdin;
\.


--
-- Data for Name: RepairSla; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."RepairSla" (id, "repairCaseId", "dueAt", "completedAt", "isBreached") FROM stdin;
\.


--
-- Data for Name: RepairStatusLog; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."RepairStatusLog" (id, "repairCaseId", "oldStatus", "newStatus", "changedById", reason, "createdAt") FROM stdin;
\.


--
-- Data for Name: RepairVisit; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."RepairVisit" (id, "repairCaseId", "technicianId", "scheduledAt", "visitedAt", notes, result, "createdAt") FROM stdin;
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."Role" (id, name) FROM stdin;
afc94207-95ce-430c-8b9f-cbabd0180ebc	superadmin
dc95b992-9225-4efe-afc7-2a053eb01d23	user
\.


--
-- Data for Name: RolePermission; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."RolePermission" (id, "roleId", "permissionId", scope, "relationType", constraints) FROM stdin;
c25f0605-7beb-4df8-ae74-d83519dc508e	afc94207-95ce-430c-8b9f-cbabd0180ebc	948dab38-2830-4597-87b9-64f13c611c35	ORG_WIDE	\N	\N
04bba225-c8d0-4802-ae79-acbe6b793584	afc94207-95ce-430c-8b9f-cbabd0180ebc	c2ee5cce-4d4f-460f-b3e1-5b4a77a7ed67	ORG_WIDE	\N	\N
2b4f8523-2820-4da0-9d54-78a0b56c72fe	afc94207-95ce-430c-8b9f-cbabd0180ebc	5b2b70b1-71ed-471c-b5dc-12de95865ecf	ORG_WIDE	\N	\N
a224a77d-4c4e-4c82-ae00-6cc2634d16df	afc94207-95ce-430c-8b9f-cbabd0180ebc	3587e87e-f34d-4b64-9f9d-d97b7926acee	ORG_WIDE	\N	\N
ee22b93d-8763-4f65-abe8-082ec0d1497c	afc94207-95ce-430c-8b9f-cbabd0180ebc	908de14d-af74-4a81-b4e3-2dfd3ef1c08c	ORG_WIDE	\N	\N
13197248-a848-4333-bca3-c73144b97b03	afc94207-95ce-430c-8b9f-cbabd0180ebc	7c7becee-5ec0-40f9-a8a0-b78c9e350c17	ORG_WIDE	\N	\N
cbf7c491-09df-47e7-b579-75cda3dec2a2	afc94207-95ce-430c-8b9f-cbabd0180ebc	ec21cf32-2c88-44b4-9ba6-e26944867ab0	ORG_WIDE	\N	\N
b9e3d714-125a-4b20-9f25-1e668aebd468	afc94207-95ce-430c-8b9f-cbabd0180ebc	f2e53a93-cf3a-403c-b129-468913c15ce9	ORG_WIDE	\N	\N
b44656a6-67b9-4d76-bb6c-080d678ea1f7	afc94207-95ce-430c-8b9f-cbabd0180ebc	197518ea-4013-4735-a578-bccee46de572	ORG_WIDE	\N	\N
2cc155c7-d2f0-4ff6-88d2-cdeea434abf7	afc94207-95ce-430c-8b9f-cbabd0180ebc	55d4986f-99cf-459f-916a-c1ed5f24326b	ORG_WIDE	\N	\N
ab3515ae-3792-49ba-87d0-d2b3de34ed9c	afc94207-95ce-430c-8b9f-cbabd0180ebc	d760e9d0-402a-48f6-8461-fc6a30672171	ORG_WIDE	\N	\N
ee5fae4d-498e-4365-b957-7b83ba08bc11	afc94207-95ce-430c-8b9f-cbabd0180ebc	1c261cd4-8670-4411-8273-ee3ae1e8d71b	ORG_WIDE	\N	\N
2bc7de91-104e-4063-b5b3-4b9cc172b5e7	afc94207-95ce-430c-8b9f-cbabd0180ebc	db36709d-c6fb-42c3-a3c7-a224129fddb7	ORG_WIDE	\N	\N
13ece990-e554-4ec9-b089-eb5dd9fe1e90	afc94207-95ce-430c-8b9f-cbabd0180ebc	3faaeff6-0dfa-42c4-929c-354a4d5cf14d	ORG_WIDE	\N	\N
beb6c790-0d63-483d-94ab-d40914b17103	afc94207-95ce-430c-8b9f-cbabd0180ebc	3a55b472-fc8e-43fe-bdf7-3724c0579de3	ORG_WIDE	\N	\N
68ad7f63-b95f-4595-9bd5-e95cf8b76d6f	afc94207-95ce-430c-8b9f-cbabd0180ebc	4b6f4b3d-d55b-4560-b690-fe56e5917904	ORG_WIDE	\N	\N
fee5e151-fcbd-4bf0-a731-7a569f7d58d5	afc94207-95ce-430c-8b9f-cbabd0180ebc	62c2b8c7-0098-428a-a6c1-eaea8400ac2c	ORG_WIDE	\N	\N
e6fb7468-dda3-431b-bdd0-2bae205435dc	afc94207-95ce-430c-8b9f-cbabd0180ebc	9a259d8f-48d0-4fa4-8f52-343b3e35e00a	ORG_WIDE	\N	\N
e5669168-5a13-44bf-8da3-cb8456178c7b	afc94207-95ce-430c-8b9f-cbabd0180ebc	c25744e8-b1b4-44d7-91c9-c9576ef4c7af	ORG_WIDE	\N	\N
496674e9-2ce0-4d0c-b7a1-326efeb89035	afc94207-95ce-430c-8b9f-cbabd0180ebc	c146ae9a-6d08-416f-95d4-fa73e1ebfc12	ORG_WIDE	\N	\N
51b7be93-89e7-49e9-aba7-6e0d535b997c	afc94207-95ce-430c-8b9f-cbabd0180ebc	e358cf9e-d510-4b07-aed4-73d027a74e19	ORG_WIDE	\N	\N
c7d83008-2f5d-475b-bcc4-5919252d084b	afc94207-95ce-430c-8b9f-cbabd0180ebc	3bf968d5-c674-4c95-a472-7895915d209e	ORG_WIDE	\N	\N
37a6f18f-8398-44a5-aa9d-f844fdf21386	afc94207-95ce-430c-8b9f-cbabd0180ebc	4e43cdf5-e636-4afd-b8c3-7a166e885657	ORG_WIDE	\N	\N
9034ac3a-0eae-4758-b6dc-8ba6e7222395	afc94207-95ce-430c-8b9f-cbabd0180ebc	540dd0bf-269e-4366-93dd-f3e2182f8092	ORG_WIDE	\N	\N
d0222309-f3cf-46c7-8cc9-154f19a8a4d9	dc95b992-9225-4efe-afc7-2a053eb01d23	7c7becee-5ec0-40f9-a8a0-b78c9e350c17	SELF	\N	\N
93cec7a8-37b3-4f88-9c93-98d5663d543a	dc95b992-9225-4efe-afc7-2a053eb01d23	1c261cd4-8670-4411-8273-ee3ae1e8d71b	SELF	\N	\N
436beaa7-bf97-4745-bf74-3f0f62fa55d6	dc95b992-9225-4efe-afc7-2a053eb01d23	9a259d8f-48d0-4fa4-8f52-343b3e35e00a	SELF	\N	\N
af5f9e08-c9bf-40a8-a7e5-3f66412512c9	dc95b992-9225-4efe-afc7-2a053eb01d23	540dd0bf-269e-4366-93dd-f3e2182f8092	SELF	\N	\N
252813b3-df6f-4e41-9d3f-92c3bd7569be	afc94207-95ce-430c-8b9f-cbabd0180ebc	e9069382-0df0-46af-92dd-0c26436f97bf	ORG_WIDE	\N	\N
66fbbd69-2505-4c47-9bc2-337f25b077a5	afc94207-95ce-430c-8b9f-cbabd0180ebc	9f1d6897-d0da-4a05-bc0d-e9dd0249e41a	ORG_WIDE	\N	\N
8c525b58-bc5a-4402-ada7-1b4cca9a762d	afc94207-95ce-430c-8b9f-cbabd0180ebc	e8e9fe27-88fd-425a-8473-39cade4eb6cc	ORG_WIDE	\N	\N
77ac63dd-157c-476f-a15e-416d8b2b1792	afc94207-95ce-430c-8b9f-cbabd0180ebc	9f73b332-7093-4c77-82a1-866f02f76667	ORG_WIDE	\N	\N
242a20d6-9e6a-4da0-a8f1-ba6221fdab4d	afc94207-95ce-430c-8b9f-cbabd0180ebc	3ffb84bd-2eb4-4159-a6f6-5c9d867ee27a	ORG_WIDE	\N	\N
537b546e-d1bc-49ba-8e92-d1b5c12200da	afc94207-95ce-430c-8b9f-cbabd0180ebc	83a1f75e-f220-4b90-b120-a5b75d06ea02	ORG_WIDE	\N	\N
5ebe71ed-1c25-4fb3-bd02-47cbdeba966c	afc94207-95ce-430c-8b9f-cbabd0180ebc	939d428a-2efe-48fe-91be-9d2c8ce08d11	ORG_WIDE	\N	\N
c8ab41a9-ece3-483d-a78b-b31a56e8dafd	afc94207-95ce-430c-8b9f-cbabd0180ebc	7a99641e-6049-4882-9913-2e79885bffac	ORG_WIDE	\N	\N
ee7aa70b-6682-4654-9083-56cbb94884d7	afc94207-95ce-430c-8b9f-cbabd0180ebc	6aa68a1d-c52d-4ceb-b66f-132b8e3e795d	ORG_WIDE	\N	\N
e8461552-40e2-4310-b0a7-2effe679ee92	afc94207-95ce-430c-8b9f-cbabd0180ebc	5fea78cb-1775-4476-864a-02cbec6a8704	ORG_WIDE	\N	\N
b14e3ceb-1b03-4bb6-9a96-ad02584e0fa0	afc94207-95ce-430c-8b9f-cbabd0180ebc	20553c0b-2ce1-4700-87b2-a2b3cf0bca77	ORG_WIDE	\N	\N
6d93dcfb-4daf-4175-aea3-4cf95b26da63	dc95b992-9225-4efe-afc7-2a053eb01d23	20553c0b-2ce1-4700-87b2-a2b3cf0bca77	SELF	\N	\N
b692509f-da16-4b4c-a04f-a2e61a605668	afc94207-95ce-430c-8b9f-cbabd0180ebc	59598bb4-ce04-4109-b77b-53293ad046fd	ORG_WIDE	\N	\N
86e77d47-27fb-4fc5-aadf-e71b4df7a8c3	afc94207-95ce-430c-8b9f-cbabd0180ebc	1ca6fd34-8b83-4812-9fa4-69a3916fc422	ORG_WIDE	\N	\N
3117060c-4310-4c50-84cc-41839fdb797d	afc94207-95ce-430c-8b9f-cbabd0180ebc	fd22bcfd-189b-47e8-99bf-c1f6a2eeb743	ORG_WIDE	\N	\N
872179b3-c97f-4d54-956e-8645784b7865	afc94207-95ce-430c-8b9f-cbabd0180ebc	f67e7357-3f67-434d-a432-6bf658408177	ORG_WIDE	\N	\N
e2e77f16-90b9-450d-adb1-bccd90798cb7	afc94207-95ce-430c-8b9f-cbabd0180ebc	9e109826-1900-42c6-8d70-0c6a6c45cbe7	ORG_WIDE	\N	\N
55c42f50-d788-44ae-b818-03b2e7a9a7e8	afc94207-95ce-430c-8b9f-cbabd0180ebc	f5c09e44-44ba-4fe8-b172-3aa3a5f581c5	ORG_WIDE	\N	\N
23f6290a-daf5-485c-b18f-2fd35a90fb3f	afc94207-95ce-430c-8b9f-cbabd0180ebc	69e87fdf-b9eb-44dd-bf9d-d357a59746ea	ORG_WIDE	\N	\N
dbec0b0d-ee05-4275-b518-764229d0b771	afc94207-95ce-430c-8b9f-cbabd0180ebc	a179f7fd-c02b-4032-96bb-8fb033f1145c	ORG_WIDE	\N	\N
ce15cef9-b962-4258-864a-6a917d0fd4fc	afc94207-95ce-430c-8b9f-cbabd0180ebc	021b8071-73b0-443e-a584-cc7acf66b1c4	ORG_WIDE	\N	\N
10c5c2fb-e9af-47a1-bdab-00006e78cd97	afc94207-95ce-430c-8b9f-cbabd0180ebc	a08b53df-673c-4fea-8e8f-79f6d4887fab	ORG_WIDE	\N	\N
8cf7bb7d-ca5a-4388-a7bd-31a88b6cbeb0	afc94207-95ce-430c-8b9f-cbabd0180ebc	ea029215-33d9-455f-b284-b44471c0bcc8	ORG_WIDE	\N	\N
b3a6fde4-d09e-4574-986b-bf562cd7c727	afc94207-95ce-430c-8b9f-cbabd0180ebc	e9cb2dac-b7bd-4cbd-a406-40f06258236f	ORG_WIDE	\N	\N
90ccb815-04f8-4189-985e-08c6d1362c74	afc94207-95ce-430c-8b9f-cbabd0180ebc	f32b35d5-0c07-4238-9402-f7d46370254e	ORG_WIDE	\N	\N
75fbcfcd-0392-4cf5-9103-cc7b21d4b00c	afc94207-95ce-430c-8b9f-cbabd0180ebc	798a0a24-22cc-4396-8041-f4edc5c81e75	ORG_WIDE	\N	\N
dc6255e2-a607-4325-9b7d-15f41e56e52b	afc94207-95ce-430c-8b9f-cbabd0180ebc	2ad0e63f-e91b-4ae4-9412-85ced181d023	ORG_WIDE	\N	\N
1c579403-87da-4a59-a43f-21841dd9cb16	afc94207-95ce-430c-8b9f-cbabd0180ebc	e3295868-ff79-4179-b220-d25db77aa8c9	ORG_WIDE	\N	\N
f13d8b49-b422-43e3-8fa2-3f33450a65b0	afc94207-95ce-430c-8b9f-cbabd0180ebc	667fbad9-25df-4520-95c5-50b5f8a5c2a5	ORG_WIDE	\N	\N
236a53d8-a9d7-40bb-a86e-b3768eb344be	afc94207-95ce-430c-8b9f-cbabd0180ebc	cbc091eb-3f82-4697-85fe-1fcf53ce89da	ORG_WIDE	\N	\N
cd78148d-b072-40e7-ad3c-e37d6943f74f	afc94207-95ce-430c-8b9f-cbabd0180ebc	03d0c770-5725-4b2d-a9a9-9d1d417f13ed	ORG_WIDE	\N	\N
8e21243a-5db6-4425-94d5-5f405739b33f	afc94207-95ce-430c-8b9f-cbabd0180ebc	c831d055-8bd9-4f6c-a157-08fe5017168d	ORG_WIDE	\N	\N
79011239-dbac-4aad-88e4-6df5c3ae5af5	afc94207-95ce-430c-8b9f-cbabd0180ebc	38bafe29-5935-4d2f-b2b4-a921ef42ca02	ORG_WIDE	\N	\N
3a823516-a357-4258-af77-b8377736784e	afc94207-95ce-430c-8b9f-cbabd0180ebc	5ce6a39a-630b-4501-87e4-a72d5e9a411d	ORG_WIDE	\N	\N
e1bc0394-e273-4c35-b31e-0f715d09f0ec	afc94207-95ce-430c-8b9f-cbabd0180ebc	eedf8420-cd03-4d25-9d0e-eed7ae3d84f7	ORG_WIDE	\N	\N
0922f8b8-d511-44c1-9ec6-1473b56110ef	afc94207-95ce-430c-8b9f-cbabd0180ebc	5ab87176-be4d-43ac-ad68-80c4a25b6e56	ORG_WIDE	\N	\N
5c283b97-6859-48cb-a3ca-acbe02f6ef73	afc94207-95ce-430c-8b9f-cbabd0180ebc	ceb85a2d-3e04-4bb2-a2b0-d6d1265cf0aa	ORG_WIDE	\N	\N
6cdafa0b-6610-4772-a315-5b217455fde2	afc94207-95ce-430c-8b9f-cbabd0180ebc	b7644d39-6837-40ed-87bb-09b65dfcd2a7	ORG_WIDE	\N	\N
9d729d98-490f-4091-af4b-74cbb94c9485	afc94207-95ce-430c-8b9f-cbabd0180ebc	836c4e29-c7cf-47df-bfe1-aa429fb056a7	ORG_WIDE	\N	\N
0552328d-aff7-4476-8068-f6f1a3bacb3e	afc94207-95ce-430c-8b9f-cbabd0180ebc	879c7002-c426-4cb0-9ccd-115e95843ddc	ORG_WIDE	\N	\N
4b125771-0d4b-4407-8d40-74948e0dca2e	afc94207-95ce-430c-8b9f-cbabd0180ebc	ae918382-e3e9-4681-a049-d9d43a21f83b	ORG_WIDE	\N	\N
c529900c-c13d-48d6-9d63-b7a7013b0d37	afc94207-95ce-430c-8b9f-cbabd0180ebc	9ec08189-70b5-44a0-8d89-11a8a384b95b	ORG_WIDE	\N	\N
fd642081-f491-449e-bd31-903030aab29f	afc94207-95ce-430c-8b9f-cbabd0180ebc	ba086fca-3112-43e1-8063-c03d1e5bb826	ORG_WIDE	\N	\N
9f76f6b7-a86e-49ba-87f5-a55c095d08b3	afc94207-95ce-430c-8b9f-cbabd0180ebc	0cd4017b-07cd-454f-aea0-c444ddd7b696	ORG_WIDE	\N	\N
e24308c8-b17d-4cdb-a581-03ec62bbc5ef	afc94207-95ce-430c-8b9f-cbabd0180ebc	6ab15c25-1723-488a-8fea-a66886e04039	ORG_WIDE	\N	\N
cdb83025-aab9-43ce-af1c-fea97579957a	afc94207-95ce-430c-8b9f-cbabd0180ebc	69aecef4-a6ff-48be-bf96-da6251043cb0	ORG_WIDE	\N	\N
37a5df6e-a37f-427a-9519-08044486ac0f	afc94207-95ce-430c-8b9f-cbabd0180ebc	edf13a39-cac6-4ea2-9666-e119074ee2c6	ORG_WIDE	\N	\N
6d9f532d-01ec-4f3e-b1ba-57d162436353	afc94207-95ce-430c-8b9f-cbabd0180ebc	1837045a-fe7a-4b1c-b134-ad2c4b9eeefd	ORG_WIDE	\N	\N
00b1f573-598b-42f8-8d9e-9e7604cdfddc	afc94207-95ce-430c-8b9f-cbabd0180ebc	663199a2-e25f-446a-bacf-8865e32cf6b7	ORG_WIDE	\N	\N
744d68f6-4194-4226-871e-def4eb660a37	afc94207-95ce-430c-8b9f-cbabd0180ebc	8c2c734a-8081-42cd-be63-85ef05848cc5	ORG_WIDE	\N	\N
258648f3-85a2-44b6-98b0-76e9ba445918	afc94207-95ce-430c-8b9f-cbabd0180ebc	a7866c66-70ae-4280-aa34-674b4d6c49c8	ORG_WIDE	\N	\N
187080f1-c778-4f2f-8373-93d182bffb59	afc94207-95ce-430c-8b9f-cbabd0180ebc	81e844cb-a3ec-4882-a8eb-6133fee70a0f	ORG_WIDE	\N	\N
cdb07f5c-e604-47a4-bcbd-a51067dbe3c0	afc94207-95ce-430c-8b9f-cbabd0180ebc	4cc2977d-654a-4b26-b1a4-97930b4698a2	ORG_WIDE	\N	\N
251ffc80-d7cd-4bf8-876b-aa81df3e97a6	afc94207-95ce-430c-8b9f-cbabd0180ebc	ee8c7610-f46c-4152-a5bb-e44854e28e60	ORG_WIDE	\N	\N
360a71e2-f72b-49ce-81c7-5c1fe4501231	afc94207-95ce-430c-8b9f-cbabd0180ebc	2abbedfa-a1ee-435f-ab16-d5bb84af920e	ORG_WIDE	\N	\N
1ab747c2-ecf1-4b1d-9e58-c4c4b7139201	afc94207-95ce-430c-8b9f-cbabd0180ebc	0de13645-6758-462d-92ea-830891583378	ORG_WIDE	\N	\N
756bc595-e37c-4a03-8666-efe29bf4b1e9	afc94207-95ce-430c-8b9f-cbabd0180ebc	1afba19c-153d-4dd9-b67b-45a8e8dcd6ce	ORG_WIDE	\N	\N
261db2fa-cbd2-404e-948f-5125e21d93ae	afc94207-95ce-430c-8b9f-cbabd0180ebc	afdfeb54-77e1-4364-a09e-fb4c8ada088d	ORG_WIDE	\N	\N
934048b8-0331-499b-94f2-4ffdce8d78c5	afc94207-95ce-430c-8b9f-cbabd0180ebc	525343df-f25e-4287-8b52-a914f4dbdb14	ORG_WIDE	\N	\N
f2f9e264-96fa-40e1-ad34-714a6c5f4f79	afc94207-95ce-430c-8b9f-cbabd0180ebc	536130ae-d841-4be7-8b73-79bfa8476672	ORG_WIDE	\N	\N
96f7a7e4-02b9-4b07-8e7a-ff3effe6086e	afc94207-95ce-430c-8b9f-cbabd0180ebc	16dfad59-2ef2-4f8a-ace4-bb3e258338e4	ORG_WIDE	\N	\N
01f2d805-66a1-4818-8333-353e086a70d4	afc94207-95ce-430c-8b9f-cbabd0180ebc	604c3a4f-ab46-4710-853b-14c2ed0c300a	ORG_WIDE	\N	\N
ac5e4ada-aa8f-48e6-8ffb-cb01ef9036a2	afc94207-95ce-430c-8b9f-cbabd0180ebc	510445b3-5180-419b-a3ed-8fdc93d9daf4	ORG_WIDE	\N	\N
c9a98cff-e2d1-485c-983e-86a3f33e4017	afc94207-95ce-430c-8b9f-cbabd0180ebc	4f0dc5ae-dcb6-4642-a119-e182f14abf26	ORG_WIDE	\N	\N
888778a2-433c-4bae-98be-1f64583debe4	afc94207-95ce-430c-8b9f-cbabd0180ebc	430de00e-810a-4170-b07d-64cd4e56cbe8	ORG_WIDE	\N	\N
6d8d9641-efb3-4c4c-b79c-b64eea05f058	afc94207-95ce-430c-8b9f-cbabd0180ebc	92dced1e-4df2-4a3c-aee4-8e2ed338195b	ORG_WIDE	\N	\N
f6376d55-208d-4f26-802e-56587b33169e	afc94207-95ce-430c-8b9f-cbabd0180ebc	d548b74b-e171-463f-8593-f949d7564983	ORG_WIDE	\N	\N
b3de3fb1-6444-4c0f-a9db-989cf49a18a3	afc94207-95ce-430c-8b9f-cbabd0180ebc	71052158-40eb-49de-ac29-c55f49a618f3	ORG_WIDE	\N	\N
b82d5ea7-f1c8-4321-ab99-678f30c1c596	afc94207-95ce-430c-8b9f-cbabd0180ebc	daa12e14-23ce-4e8c-b6bd-c764a5e6d460	ORG_WIDE	\N	\N
919fd65c-f295-4ccc-acab-df9053c7c0c4	afc94207-95ce-430c-8b9f-cbabd0180ebc	77ded01b-4ad3-4a13-8c60-fc9a69e1cc80	ORG_WIDE	\N	\N
3e3a0689-a81c-4912-9a06-07c7aa88d364	afc94207-95ce-430c-8b9f-cbabd0180ebc	b8ff4e49-82c3-49d6-a530-080fcb64d5a5	ORG_WIDE	\N	\N
f49a0085-420e-4a46-82c2-e57e9bcfa8ac	afc94207-95ce-430c-8b9f-cbabd0180ebc	ed354f2f-1936-4554-ac71-49d4b012acb3	ORG_WIDE	\N	\N
17fa131c-48fe-4214-b723-7071f790afb9	afc94207-95ce-430c-8b9f-cbabd0180ebc	21e14bdf-4782-497a-8c7e-ffeb9c40496c	ORG_WIDE	\N	\N
9fa87501-625c-44a4-9a6c-f414cd50e4ce	afc94207-95ce-430c-8b9f-cbabd0180ebc	774b2098-64ff-426f-aa26-303d88e0b0bb	ORG_WIDE	\N	\N
b7aa655e-d0a3-4f77-a79d-25c1d9eacb8f	afc94207-95ce-430c-8b9f-cbabd0180ebc	993c720f-9477-44ab-8537-98017e64e01d	ORG_WIDE	\N	\N
15c7c8c1-df3c-460f-a397-a115da721ed1	afc94207-95ce-430c-8b9f-cbabd0180ebc	b996b09b-f88d-4c0f-aea9-848593f67ad6	ORG_WIDE	\N	\N
b3f4a99e-7d24-4f82-853a-b28c8e63fdb3	afc94207-95ce-430c-8b9f-cbabd0180ebc	fd5c6402-fc7f-4580-8c76-65119ef71427	ORG_WIDE	\N	\N
24290c1c-3da1-49b5-8915-c22bd406f3cf	afc94207-95ce-430c-8b9f-cbabd0180ebc	c4f7e8ed-f18e-4200-bf28-12c2311cf12c	ORG_WIDE	\N	\N
bb496021-7f43-4b9e-89ed-2888d8d15cd8	afc94207-95ce-430c-8b9f-cbabd0180ebc	b5f4e564-084e-4793-963e-0b3452efc3b6	ORG_WIDE	\N	\N
ad2d408d-6118-4632-9ad5-e2fb959a6504	afc94207-95ce-430c-8b9f-cbabd0180ebc	f4714039-55f5-40fc-bc6c-038ddc38aaa1	ORG_WIDE	\N	\N
3581a32a-b136-4a5c-a610-ce228c2f5c45	afc94207-95ce-430c-8b9f-cbabd0180ebc	6035a830-bd84-4f46-9eac-c1f07a06a27e	ORG_WIDE	\N	\N
bef881b3-0a86-4c58-a306-f26f6e406abe	afc94207-95ce-430c-8b9f-cbabd0180ebc	4efec012-e831-4f93-aff8-e7ad9972d12d	ORG_WIDE	\N	\N
01f64001-f566-4cc0-bd1d-0739646b5b67	afc94207-95ce-430c-8b9f-cbabd0180ebc	c06a5c9f-b0b7-4624-924f-da6d34287b15	ORG_WIDE	\N	\N
e559412c-751f-4a23-b428-eeec456cb14b	afc94207-95ce-430c-8b9f-cbabd0180ebc	8f5b746c-c21b-458e-b3c2-f50185ce6f1c	ORG_WIDE	\N	\N
430e02fa-96ed-4aa7-a0bf-b6d5b0a1565b	afc94207-95ce-430c-8b9f-cbabd0180ebc	a1bbf622-1509-4f4f-9213-ac61955778b5	ORG_WIDE	\N	\N
b955d9e2-f302-4fb0-9f3b-57413d33ff10	afc94207-95ce-430c-8b9f-cbabd0180ebc	42f0f226-bbf3-49a5-8c1f-f5f7cfcb5741	ORG_WIDE	\N	\N
837edd9e-c475-4133-9da4-66e6226ce472	afc94207-95ce-430c-8b9f-cbabd0180ebc	88c70f82-1cd2-400d-871c-b99a6ac24288	ORG_WIDE	\N	\N
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."User" (id, name, "departmentId", "managerId", "createdAt", "refreshToken", "phoneNumber", "baleChatId", "employeeCode") FROM stdin;
45b3c80d-c513-46ac-aac9-dff3f5374acb	Super Admin	seed-dept-id	\N	2026-06-01 11:45:14.772	\N	09170260302	413139277	\N
ad3a1c34-7bc2-43ae-92c7-36e37f77fb8d	Super Admin	seed-dept-id	\N	2026-05-13 07:56:23.483	$2b$10$iDg5WkXlNGA7m8tWq2r8C.csj5sNpRVQRezAHbNJPgWQE13prrO6m	09164532683	\N	\N
\.


--
-- Data for Name: UserInfo; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."UserInfo" (id, "userId", "firstName", "lastName", "fatherName", "birthDate", "nationalCode", "birthPlace", residence, mobile, "homePhone", degree, university, "graduateYear", "createdAt", "updatedAt") FROM stdin;
bdb58777-be19-4d42-971d-9ee48dba8006	ad3a1c34-7bc2-43ae-92c7-36e37f77fb8d	محمد	محمدی	حسن	1370/01/01	1234567890	تهران	تهران	09121234567	02112345678	کارشناسی	دانشگاه تهران	1392	2026-05-13 09:12:32.857	2026-05-13 09:13:44.125
\.


--
-- Data for Name: UserRole; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public."UserRole" ("userId", "roleId") FROM stdin;
ad3a1c34-7bc2-43ae-92c7-36e37f77fb8d	afc94207-95ce-430c-8b9f-cbabd0180ebc
45b3c80d-c513-46ac-aac9-dff3f5374acb	afc94207-95ce-430c-8b9f-cbabd0180ebc
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: app
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
3d6da707-d80a-45e1-af72-360a984aea77	bfb0c4a5c134f5233fb6c5be0f5e436738f368bc4bb8e030508aac3d03219662	2026-05-06 10:41:02.170319+00	20260227200213_init	\N	\N	2026-05-06 10:41:02.026544+00	1
2c9fe4a4-637d-481d-9e47-b33bd49deb08	aa3ade42f963cf4b9e0f7d70d3d06c1d275d61509973196d2b1a7da6cb0639ed	2026-05-06 10:41:02.181714+00	20260227201521_inittest2	\N	\N	2026-05-06 10:41:02.173082+00	1
4f9921de-7627-4816-a96f-7328845bf620	dd8cb088c836228c1592a8fd91ee651c939c36685646fd9190336f423bda0688	2026-05-06 10:41:02.20566+00	20260315224945_replace_email_password_with_phone_otp	\N	\N	2026-05-06 10:41:02.184761+00	1
4edf75e0-7d25-4245-bffa-cf6402bed3f3	239d4842ed703c8bf34389617cf8af4143418f1c7d159a8ca3b780f9a37b83b5	2026-05-06 10:41:02.294716+00	20260404000000_add_forms_rabbitmq	\N	\N	2026-05-06 10:41:02.208834+00	1
dca3e97c-e609-4fff-8d75-a6b2cee2604f	cb63163f84322b04fa9dc16964563341b3cab1970129b3418b5df76666efabff	2026-05-06 10:41:02.745448+00	20260506104102_add_user_info	\N	\N	2026-05-06 10:41:02.695317+00	1
271ef651-3388-4e80-9724-706253c9b39d	ea64ff6ccb5a0241d7ae3078a8f6b20d05c37407ab7ec587716a5687388b1ab4	2026-06-01 11:31:48.200756+00	20260508014216_add_approval_workflow	\N	\N	2026-06-01 11:31:48.156555+00	1
0c05bcaa-72fd-41e6-bc49-4b957f369fbc	a6446d196174c4c833a7f532e96f1e278f9748c59ddd03887902d5aab7b54656	2026-06-01 11:31:48.207991+00	20260510004531_cascade_user_role	\N	\N	2026-06-01 11:31:48.202019+00	1
77bc27d3-4158-44ed-becc-64c6d723a04d	0f58fcaf9df494617cd9948ea73422019675e4782202b1fb6001201b8ee4af68	2026-06-01 11:31:48.524241+00	20260601113148_add_bale_chat_id	\N	\N	2026-06-01 11:31:48.519146+00	1
1fbb964c-16a3-4571-9977-4629e2afae04	afbd60478110d59ba1ce700b59645164327226991dfb8851b1af1e85a13d4ef7	2026-06-25 15:42:00.463291+00	20260612233008_add_attendance	\N	\N	2026-06-25 15:42:00.433314+00	1
98cbf2e3-dcb8-4458-873a-a711efb623b1	d90f1bd2c389a3b7f23a521aee89058baaa9318934a1020b55e1dac5ed4e02fe	2026-06-25 15:42:00.529212+00	20260619162651_repair	\N	\N	2026-06-25 15:42:00.465446+00	1
84101047-d2b4-449c-988d-ec479f28a380	fbec0b214dc9a5ac12bce200848be73eb4295f427c1a3541b338d01b4deac02d	2026-06-25 15:42:11.870989+00	20260625154211_expand_customer	\N	\N	2026-06-25 15:42:11.842992+00	1
581ee0a4-3fe2-44c2-8708-9d17aa02e746	1998b184b9ab750672cb071bda1784c8042536cca6551d4d18b41a673c9f8568	2026-06-26 12:14:15.572859+00	20260626121415_expand_customer	\N	\N	2026-06-26 12:14:15.535097+00	1
\.


--
-- Name: ApprovalAction ApprovalAction_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."ApprovalAction"
    ADD CONSTRAINT "ApprovalAction_pkey" PRIMARY KEY (id);


--
-- Name: ApprovalInstance ApprovalInstance_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."ApprovalInstance"
    ADD CONSTRAINT "ApprovalInstance_pkey" PRIMARY KEY (id);


--
-- Name: ApprovalPolicy ApprovalPolicy_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."ApprovalPolicy"
    ADD CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY (id);


--
-- Name: ApprovalStep ApprovalStep_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."ApprovalStep"
    ADD CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY (id);


--
-- Name: Attendance Attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_pkey" PRIMARY KEY (id);


--
-- Name: Customer Customer_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."Customer"
    ADD CONSTRAINT "Customer_pkey" PRIMARY KEY (id);


--
-- Name: DepartmentRelation DepartmentRelation_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."DepartmentRelation"
    ADD CONSTRAINT "DepartmentRelation_pkey" PRIMARY KEY (id);


--
-- Name: Department Department_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_pkey" PRIMARY KEY (id);


--
-- Name: FormAnalysis FormAnalysis_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."FormAnalysis"
    ADD CONSTRAINT "FormAnalysis_pkey" PRIMARY KEY (id);


--
-- Name: FormStat FormStat_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."FormStat"
    ADD CONSTRAINT "FormStat_pkey" PRIMARY KEY (id);


--
-- Name: FormSubmission FormSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."FormSubmission"
    ADD CONSTRAINT "FormSubmission_pkey" PRIMARY KEY (id);


--
-- Name: Form Form_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."Form"
    ADD CONSTRAINT "Form_pkey" PRIMARY KEY (id);


--
-- Name: NotificationEvent NotificationEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."NotificationEvent"
    ADD CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY (id);


--
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- Name: Relative Relative_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."Relative"
    ADD CONSTRAINT "Relative_pkey" PRIMARY KEY (id);


--
-- Name: RepairCase RepairCase_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RepairCase"
    ADD CONSTRAINT "RepairCase_pkey" PRIMARY KEY (id);


--
-- Name: RepairItem RepairItem_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RepairItem"
    ADD CONSTRAINT "RepairItem_pkey" PRIMARY KEY (id);


--
-- Name: RepairSla RepairSla_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RepairSla"
    ADD CONSTRAINT "RepairSla_pkey" PRIMARY KEY (id);


--
-- Name: RepairStatusLog RepairStatusLog_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RepairStatusLog"
    ADD CONSTRAINT "RepairStatusLog_pkey" PRIMARY KEY (id);


--
-- Name: RepairVisit RepairVisit_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RepairVisit"
    ADD CONSTRAINT "RepairVisit_pkey" PRIMARY KEY (id);


--
-- Name: RolePermission RolePermission_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: UserInfo UserInfo_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."UserInfo"
    ADD CONSTRAINT "UserInfo_pkey" PRIMARY KEY (id);


--
-- Name: UserRole UserRole_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId", "roleId");


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ApprovalInstance_submissionId_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "ApprovalInstance_submissionId_key" ON public."ApprovalInstance" USING btree ("submissionId");


--
-- Name: ApprovalPolicy_formId_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "ApprovalPolicy_formId_key" ON public."ApprovalPolicy" USING btree ("formId");


--
-- Name: ApprovalStep_policyId_stepOrder_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "ApprovalStep_policyId_stepOrder_key" ON public."ApprovalStep" USING btree ("policyId", "stepOrder");


--
-- Name: Attendance_userId_checkTime_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "Attendance_userId_checkTime_key" ON public."Attendance" USING btree ("userId", "checkTime");


--
-- Name: Attendance_userId_date_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX "Attendance_userId_date_idx" ON public."Attendance" USING btree ("userId", date);


--
-- Name: Customer_nationalCode_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "Customer_nationalCode_key" ON public."Customer" USING btree ("nationalCode");


--
-- Name: DepartmentRelation_fromDepartmentId_toDepartmentId_type_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "DepartmentRelation_fromDepartmentId_toDepartmentId_type_key" ON public."DepartmentRelation" USING btree ("fromDepartmentId", "toDepartmentId", type);


--
-- Name: FormAnalysis_formId_fieldId_metric_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "FormAnalysis_formId_fieldId_metric_key" ON public."FormAnalysis" USING btree ("formId", "fieldId", metric);


--
-- Name: FormAnalysis_formId_idx; Type: INDEX; Schema: public; Owner: app
--

CREATE INDEX "FormAnalysis_formId_idx" ON public."FormAnalysis" USING btree ("formId");


--
-- Name: FormStat_formId_fieldId_metric_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "FormStat_formId_fieldId_metric_key" ON public."FormStat" USING btree ("formId", "fieldId", metric);


--
-- Name: Permission_action_resource_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "Permission_action_resource_key" ON public."Permission" USING btree (action, resource);


--
-- Name: RepairCase_caseNumber_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "RepairCase_caseNumber_key" ON public."RepairCase" USING btree ("caseNumber");


--
-- Name: RepairSla_repairCaseId_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "RepairSla_repairCaseId_key" ON public."RepairSla" USING btree ("repairCaseId");


--
-- Name: RolePermission_roleId_permissionId_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON public."RolePermission" USING btree ("roleId", "permissionId");


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: UserInfo_nationalCode_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "UserInfo_nationalCode_key" ON public."UserInfo" USING btree ("nationalCode");


--
-- Name: UserInfo_userId_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "UserInfo_userId_key" ON public."UserInfo" USING btree ("userId");


--
-- Name: User_employeeCode_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "User_employeeCode_key" ON public."User" USING btree ("employeeCode");


--
-- Name: User_phoneNumber_key; Type: INDEX; Schema: public; Owner: app
--

CREATE UNIQUE INDEX "User_phoneNumber_key" ON public."User" USING btree ("phoneNumber");


--
-- Name: ApprovalAction ApprovalAction_approverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."ApprovalAction"
    ADD CONSTRAINT "ApprovalAction_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ApprovalAction ApprovalAction_instanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."ApprovalAction"
    ADD CONSTRAINT "ApprovalAction_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES public."ApprovalInstance"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ApprovalAction ApprovalAction_stepId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."ApprovalAction"
    ADD CONSTRAINT "ApprovalAction_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES public."ApprovalStep"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ApprovalInstance ApprovalInstance_submissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."ApprovalInstance"
    ADD CONSTRAINT "ApprovalInstance_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES public."FormSubmission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ApprovalPolicy ApprovalPolicy_formId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."ApprovalPolicy"
    ADD CONSTRAINT "ApprovalPolicy_formId_fkey" FOREIGN KEY ("formId") REFERENCES public."Form"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ApprovalStep ApprovalStep_policyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."ApprovalStep"
    ADD CONSTRAINT "ApprovalStep_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES public."ApprovalPolicy"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ApprovalStep ApprovalStep_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."ApprovalStep"
    ADD CONSTRAINT "ApprovalStep_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Attendance Attendance_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."Attendance"
    ADD CONSTRAINT "Attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: DepartmentRelation DepartmentRelation_fromDepartmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."DepartmentRelation"
    ADD CONSTRAINT "DepartmentRelation_fromDepartmentId_fkey" FOREIGN KEY ("fromDepartmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: DepartmentRelation DepartmentRelation_toDepartmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."DepartmentRelation"
    ADD CONSTRAINT "DepartmentRelation_toDepartmentId_fkey" FOREIGN KEY ("toDepartmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Department Department_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."Department"
    ADD CONSTRAINT "Department_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: FormAnalysis FormAnalysis_formId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."FormAnalysis"
    ADD CONSTRAINT "FormAnalysis_formId_fkey" FOREIGN KEY ("formId") REFERENCES public."Form"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FormStat FormStat_formId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."FormStat"
    ADD CONSTRAINT "FormStat_formId_fkey" FOREIGN KEY ("formId") REFERENCES public."Form"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FormSubmission FormSubmission_formId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."FormSubmission"
    ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES public."Form"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: FormSubmission FormSubmission_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."FormSubmission"
    ADD CONSTRAINT "FormSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Relative Relative_userInfoId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."Relative"
    ADD CONSTRAINT "Relative_userInfoId_fkey" FOREIGN KEY ("userInfoId") REFERENCES public."UserInfo"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RepairCase RepairCase_customerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RepairCase"
    ADD CONSTRAINT "RepairCase_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES public."Customer"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RepairCase RepairCase_technicianId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RepairCase"
    ADD CONSTRAINT "RepairCase_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: RepairItem RepairItem_repairCaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RepairItem"
    ADD CONSTRAINT "RepairItem_repairCaseId_fkey" FOREIGN KEY ("repairCaseId") REFERENCES public."RepairCase"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RepairStatusLog RepairStatusLog_changedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RepairStatusLog"
    ADD CONSTRAINT "RepairStatusLog_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RepairStatusLog RepairStatusLog_repairCaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RepairStatusLog"
    ADD CONSTRAINT "RepairStatusLog_repairCaseId_fkey" FOREIGN KEY ("repairCaseId") REFERENCES public."RepairCase"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RepairVisit RepairVisit_repairCaseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RepairVisit"
    ADD CONSTRAINT "RepairVisit_repairCaseId_fkey" FOREIGN KEY ("repairCaseId") REFERENCES public."RepairCase"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RepairVisit RepairVisit_technicianId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RepairVisit"
    ADD CONSTRAINT "RepairVisit_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RolePermission RolePermission_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: RolePermission RolePermission_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserInfo UserInfo_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."UserInfo"
    ADD CONSTRAINT "UserInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRole UserRole_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserRole UserRole_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."UserRole"
    ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_departmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES public."Department"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_managerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict PbJ5uphmE2MUqCnZBbh0W1Bj8Fr5fBGoxzeOqFINhrlluAYlwc2FwowcXSmpqIp

