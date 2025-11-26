'use client'

import { useState } from 'react'
import { Team, CanvasData } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const canvasSchema = z.object({
  problem: z.string().min(10, 'Please describe the problem (min 10 characters)'),
  solution: z.string().min(10, 'Please describe the solution (min 10 characters)'),
  target_audience: z.string().min(5, 'Please specify the target audience'),
  revenue_model: z.string().min(5, 'Please describe the revenue model'),
})

type CanvasFormData = z.infer<typeof canvasSchema>

interface CanvasFormProps {
  team: Team
  isLocked: boolean
  onUpdate: () => void
}

export function CanvasForm({ team, isLocked, onUpdate }: CanvasFormProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<CanvasFormData>({
    resolver: zodResolver(canvasSchema),
    defaultValues: team.canvas_data,
  })

  const onSubmit = async (data: CanvasFormData) => {
    setIsSaving(true)
    setSaveMessage(null)

    try {
      const { error } = await supabase
        .from('teams')
        .update({ canvas_data: data })
        .eq('id', team.id)

      if (error) throw error

      setSaveMessage('Saved successfully!')
      onUpdate()

      setTimeout(() => setSaveMessage(null), 3000)
    } catch (error) {
      console.error('Failed to save canvas:', error)
      setSaveMessage('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Canvas</CardTitle>
        <CardDescription>
          Define your project using the Problem-Solution framework
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="problem">
              Problem Statement <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="problem"
              placeholder="What problem are you solving?"
              rows={4}
              disabled={isLocked}
              {...register('problem')}
            />
            {errors.problem && (
              <p className="text-sm text-red-600">{errors.problem.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="solution">
              Solution <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="solution"
              placeholder="Describe your solution"
              rows={4}
              disabled={isLocked}
              {...register('solution')}
            />
            {errors.solution && (
              <p className="text-sm text-red-600">{errors.solution.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_audience">
              Target Audience <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="target_audience"
              placeholder="Who is this for?"
              rows={3}
              disabled={isLocked}
              {...register('target_audience')}
            />
            {errors.target_audience && (
              <p className="text-sm text-red-600">{errors.target_audience.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="revenue_model">
              Revenue Model <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="revenue_model"
              placeholder="How will you make money?"
              rows={3}
              disabled={isLocked}
              {...register('revenue_model')}
            />
            {errors.revenue_model && (
              <p className="text-sm text-red-600">{errors.revenue_model.message}</p>
            )}
          </div>

          {saveMessage && (
            <div
              className={`p-3 rounded-lg ${
                saveMessage.includes('success')
                  ? 'bg-green-50 text-green-600 border border-green-200'
                  : 'bg-red-50 text-red-600 border border-red-200'
              }`}
            >
              {saveMessage}
            </div>
          )}

          <Button type="submit" disabled={isLocked || isSaving || !isDirty} className="w-full">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Canvas
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
