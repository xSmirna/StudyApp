import { useEffect, useState } from 'react'
import { CreamButton } from '../components/CreamButton'
import { ErrorBanner } from '../components/ErrorBanner'
import { getChapter } from '../db/repositories/chapters'
import {
  createQuestion,
  getQuestionWithOptions,
  updateQuestion,
} from '../db/repositories/questions'
import type { QuestionInput, QuestionWithOptions } from '../domain/types'
import { QuestionEditorForm } from '../features/questions/QuestionEditorForm'
import type { Route } from '../navigation'
import { toUserMessage } from '../services/errors'

interface QuestionEditorPageProps {
  subjectId: string
  chapterId: string
  questionId?: string
  onNavigate: (route: Route) => void
}

export function QuestionEditorPage({
  subjectId,
  chapterId,
  questionId,
  onNavigate,
}: QuestionEditorPageProps) {
  const [initial, setInitial] = useState<QuestionWithOptions | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(questionId))
  const isEdit = Boolean(questionId)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const chapter = await getChapter(chapterId)
        if (!chapter || chapter.subjectId !== subjectId) {
          throw new Error('Chapter not found.')
        }

        if (!questionId) {
          if (!cancelled) {
            setLoading(false)
          }
          return
        }

        const question = await getQuestionWithOptions(questionId)
        if (!question || question.chapterId !== chapterId) {
          throw new Error('Question not found.')
        }

        if (!cancelled) {
          setInitial(question)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(toUserMessage(err))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [subjectId, chapterId, questionId])

  function goBackToChapter() {
    onNavigate({ name: 'chapter', subjectId, chapterId })
  }

  async function handleSubmit(input: QuestionInput) {
    if (questionId) {
      await updateQuestion(questionId, input)
    } else {
      await createQuestion(input)
    }
    goBackToChapter()
  }

  if (loading) {
    return (
      <section className="page">
        <p>Loading…</p>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="progress-quiz-row question-editor-header">
        <CreamButton
          iconOnly
          className="progress-back-button"
          aria-label="Back to chapter"
          title="Back to chapter"
          onClick={goBackToChapter}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
            />
          </svg>
        </CreamButton>
        <h1 className="panel-inline-title">
          {isEdit ? 'Edit question' : 'New question'}
        </h1>
      </div>

      {error ? <ErrorBanner message={error} /> : null}

      {!error ? (
        <QuestionEditorForm
          chapterId={chapterId}
          initial={initial ?? undefined}
          submitLabel={isEdit ? 'Save changes' : 'Create question'}
          onSubmit={handleSubmit}
          onCancel={goBackToChapter}
        />
      ) : null}
    </section>
  )
}
