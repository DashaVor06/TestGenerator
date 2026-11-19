// Порты (интерфейсы) слоя доступа к данным.
// Объявляются здесь (application), реализуются в infrastructure/persistence.

import type {
  AnswerOption,
  Difficulty,
  Generation,
  Material,
  MaterialSource,
  Notification,
  ProcessingStatus,
  Question,
  QuestionType,
  CognitiveLevel,
  Test,
  TestLanguage,
  TestResult,
  TestAnswer,
  User,
  Visibility,
} from "@/domain/entities";
import type { TestSettings } from "@/domain/entities/test";

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
  updateLanguage(id: string, language: TestLanguage): Promise<User>;
}

// --- Материалы ------------------------------------------------------------

export interface CreateMaterialInput {
  ownerId: string;
  title: string;
  content?: string | null;
  fileUrl?: string | null;
  fileType?: string | null;
  source?: MaterialSource;
  sourceUrl?: string | null;
  status?: ProcessingStatus;
}

export interface ListMaterialsParams {
  search?: string;
  sortBy?: "createdAt" | "title";
  sortOrder?: "asc" | "desc";
}

export interface MaterialRepository {
  findById(id: string): Promise<Material | null>;
  listByOwner(ownerId: string, params?: ListMaterialsParams): Promise<Material[]>;
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
  language?: TestLanguage;
  visibility?: Visibility;
  materialId?: string | null;
}

export interface UpdateTestInput {
  title?: string;
  category?: string | null;
  description?: string | null;
  language?: TestLanguage;
  visibility?: Visibility;
  shareToken?: string | null;
  status?: ProcessingStatus;
  materialId?: string | null;
  settings?: TestSettings | null;
}

export interface ListTestsParams {
  ownerId?: string;
  visibility?: Visibility;
  search?: string;
  category?: string;
  sortBy?: "createdAt" | "title";
  sortOrder?: "asc" | "desc";
  skip?: number;
  take?: number;
}

export interface TestRepository {
  findById(id: string): Promise<Test | null>;
  findByShareToken(token: string): Promise<Test | null>;
  list(params: ListTestsParams): Promise<Test[]>;
  count(params: ListTestsParams): Promise<number>;
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
  order?: number;
}

export interface CreateQuestionInput {
  type: QuestionType;
  text: string;
  difficulty: Difficulty | null;
  cognitiveLevel: CognitiveLevel;
  explanation: string | null;
  sourceQuote: string | null;
  expectedAnswer: string | null;
  points: number;
  order: number;
  options: CreateQuestionOptionInput[];
}

export interface UpdateQuestionInput {
  type?: QuestionType;
  text?: string;
  difficulty?: Difficulty | null;
  cognitiveLevel?: CognitiveLevel;
  explanation?: string | null;
  sourceQuote?: string | null;
  expectedAnswer?: string | null;
  points?: number;
  order?: number;
  options?: CreateQuestionOptionInput[];
}

export interface QuestionRepository {
  findById(id: string): Promise<Question | null>;
  listByTest(testId: string): Promise<Question[]>;
  listByTestWithOptions(testId: string): Promise<QuestionWithOptions[]>;
  createMany(testId: string, questions: CreateQuestionInput[]): Promise<void>;
  create(testId: string, question: CreateQuestionInput): Promise<Question>;
  update(id: string, input: UpdateQuestionInput): Promise<Question>;
  delete(id: string): Promise<void>;
  deleteByTest(testId: string): Promise<void>;
}

// --- Результаты -----------------------------------------------------------

export interface CreateTestAnswerInput {
  questionId: string;
  selectedOptionIds: string[];
  textAnswer: string | null;
  isCorrect: boolean;
  pointsAwarded: number;
}

export interface CreateTestResultInput {
  testId: string;
  userId: string | null;
  guestName: string | null;
  score: number;
  maxScore: number;
  percentCorrect: number;
  durationMs: number | null;
  answers: CreateTestAnswerInput[];
}

/** Всё, что нужно для экрана разбора ошибок. */
export interface ResultDetails {
  result: TestResult;
  test: Test;
  answers: TestAnswer[];
  questions: QuestionWithOptions[];
}

/** Результат вместе с тестом — для списка «Мои результаты». */
export interface ResultWithTest {
  result: TestResult;
  test: Test;
}

export interface TestResultRepository {
  create(input: CreateTestResultInput): Promise<TestResult>;
  findById(id: string): Promise<TestResult | null>;
  findDetailed(id: string): Promise<ResultDetails | null>;
  listByUser(userId: string): Promise<TestResult[]>;
  listByUserWithTest(userId: string): Promise<ResultWithTest[]>;
  listByTest(testId: string): Promise<TestResult[]>;
}

// --- Журнал генераций -----------------------------------------------------

export interface CreateGenerationInput {
  testId: string;
  userId: string;
  model: string;
  effort: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  questionsCount: number;
}

export interface GenerationRepository {
  create(input: CreateGenerationInput): Promise<Generation>;
  listByTest(testId: string): Promise<Generation[]>;
  totalCostByUser(userId: string): Promise<number>;
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
