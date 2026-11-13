import { useEffect, useState } from 'react'
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

  async function handleSubmit(input: QuestionInput) {
    if (questionId) {
      await updateQuestion(questionId, input)
    } else {
      await createQuestion(input)
    }
    onNavigate({ name: 'chapter', subjectId, chapterId })
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
      <button
        type="button"
        className="linkish"
        onClick={() => onNavigate({ name: 'chapter', subjectId, chapterId })}
      >
        ← Back to chapter
      </button>
      <h1>{isEdit ? 'Edit question' : 'New question'}</h1>
      <p className="muted">
        Question text and answers support Unicode (including Greek and French).
      </p>

      {error ? <ErrorBanner message={error} /> : null}

      {!error ? (
        <QuestionEditorForm
          chapterId={chapterId}
          initial={initial ?? undefined}
          submitLabel={isEdit ? 'Save changes' : 'Create question'}
          onSubmit={handleSubmit}
          onCancel={() =>
            onNavigate({ name: 'chapter', subjectId, chapterId })
          }
        />
      ) : null}
    </section>
  )
}
