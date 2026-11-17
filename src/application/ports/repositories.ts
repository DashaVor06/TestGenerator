// Порты (интерфейсы) слоя доступа к данным.
// Объявляются здесь (application), реализуются в infrastructure/persistence.

import type {
  AnswerOption,
  Material,
  Notification,
  ProcessingStatus,
  Question,
  QuestionType,
  Test,
  TestResult,
  User,
} from "@/domain/entities";

// --- Пользователи ---------------------------------------------------------

export interface CreateUserInput {
  username: string;
  email: string;
  passwordHash: string;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
}

// --- Материалы ------------------------------------------------------------

export interface CreateMaterialInput {
  ownerId: string;
  title: string;
  content?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
}

export interface MaterialRepository {
  findById(id: string): Promise<Material | null>;
  listByOwner(ownerId: string): Promise<Material[]>;
  create(input: CreateMaterialInput): Promise<Material>;
  updateStatus(id: string, status: ProcessingStatus): Promise<Material>;
  delete(id: string): Promise<void>;
}

// --- Тесты ----------------------------------------------------------------

export interface CreateTestInput {
  ownerId: string;
  title: string;
  category?: string | null;
  description?: string | null;
}

export interface UpdateTestInput {
  title?: string;
  category?: string | null;
  description?: string | null;
  status?: ProcessingStatus;
}

export interface ListTestsParams {
  ownerId?: string;
  search?: string;
  category?: string;
  sortBy?: "createdAt" | "title";
  sortOrder?: "asc" | "desc";
}

export interface TestRepository {
  findById(id: string): Promise<Test | null>;
  list(params: ListTestsParams): Promise<Test[]>;
  create(input: CreateTestInput): Promise<Test>;
  update(id: string, input: UpdateTestInput): Promise<Test>;
  delete(id: string): Promise<void>;
}

// --- Вопросы --------------------------------------------------------------

export interface QuestionWithOptions extends Question {
  options: AnswerOption[];
}

export interface TestWithQuestions extends Test {
  questions: QuestionWithOptions[];
}

export interface CreateQuestionOptionInput {
  text: string;
  isCorrect: boolean;
}

export interface CreateQuestionInput {
  type: QuestionType;
  text: string;
  difficulty: string | null;
  explanation: string | null;
  order: number;
  options: CreateQuestionOptionInput[];
}

export interface QuestionRepository {
  listByTest(testId: string): Promise<Question[]>;
  listByTestWithOptions(testId: string): Promise<QuestionWithOptions[]>;
  createMany(testId: string, questions: CreateQuestionInput[]): Promise<void>;
  deleteByTest(testId: string): Promise<void>;
}

// --- Результаты -----------------------------------------------------------

export interface CreateTestResultInput {
  testId: string;
  userId: string;
  score: number;
  percentCorrect: number;
}

export interface TestResultRepository {
  create(input: CreateTestResultInput): Promise<TestResult>;
  listByUser(userId: string): Promise<TestResult[]>;
}

// --- Уведомления ----------------------------------------------------------

export interface CreateNotificationInput {
  userId: string;
  type: string;
  message: string;
}

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<Notification>;
  listByUser(userId: string): Promise<Notification[]>;
}
