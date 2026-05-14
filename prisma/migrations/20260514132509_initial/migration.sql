-- CreateTable
CREATE TABLE "running" (
    "quizId" TEXT NOT NULL,
    "starttime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "running_pkey" PRIMARY KEY ("quizId")
);

-- CreateTable
CREATE TABLE "results" (
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("quizId","userId")
);
