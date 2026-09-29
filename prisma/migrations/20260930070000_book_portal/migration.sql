-- CreateTable
CREATE TABLE "CourseBookContent" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseBookContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChapterCovered" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "markedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChapterCovered_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "stem" TEXT NOT NULL,
    "options" TEXT[],
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionAttempt" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "chosen" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseImage" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "findingLabel" TEXT NOT NULL,
    "options" TEXT[],
    "explanation" TEXT,
    "consented" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseBookContent_chapterId_key" ON "CourseBookContent"("chapterId");

-- CreateIndex
CREATE INDEX "BookProgress_studentId_idx" ON "BookProgress"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "BookProgress_studentId_chapterId_key" ON "BookProgress"("studentId", "chapterId");

-- CreateIndex
CREATE UNIQUE INDEX "ChapterCovered_chapterId_batchId_key" ON "ChapterCovered"("chapterId", "batchId");

-- CreateIndex
CREATE INDEX "Question_chapterId_reviewed_idx" ON "Question"("chapterId", "reviewed");

-- CreateIndex
CREATE INDEX "QuestionAttempt_studentId_createdAt_idx" ON "QuestionAttempt"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionAttempt_questionId_idx" ON "QuestionAttempt"("questionId");

-- CreateIndex
CREATE INDEX "CaseImage_chapterId_idx" ON "CaseImage"("chapterId");

-- AddForeignKey
ALTER TABLE "CourseBookContent" ADD CONSTRAINT "CourseBookContent_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "CourseBookChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookProgress" ADD CONSTRAINT "BookProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookProgress" ADD CONSTRAINT "BookProgress_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "CourseBookChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterCovered" ADD CONSTRAINT "ChapterCovered_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "CourseBookChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChapterCovered" ADD CONSTRAINT "ChapterCovered_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "CourseBookChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseImage" ADD CONSTRAINT "CaseImage_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "CourseBookChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

