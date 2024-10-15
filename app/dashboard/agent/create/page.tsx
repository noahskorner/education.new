'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import React, { useRef, useState } from 'react'
import ollama, { ChatRequest, ChatResponse, Message } from 'ollama/browser'
import type { A as AbortableAsyncIterator } from 'ollama/dist/shared/ollama.51f6cea9'
import { Switch } from '@/components/ui/switch'
import Markdown from 'react-markdown'

const SYSTEM_PROMPT_PLACEHOLDER = `You are a helpful assistant knowledgeable about technology and programming. Your goal is to provide clear, concise, and accurate answers to users' questions while encouraging a positive and engaging interaction. Always ask follow-up questions to ensure the user's needs are met.`
const USER_PROMPT_PLACEHOLDER = `Can you explain the difference between a framework and a library in software development?`

export default function CreateAgentPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: '',
    },
  ])
  const [currentMessage, setCurrentMessage] = useState<Message>({
    role: 'user',
    content: '',
  })
  const [loading, setLoading] = useState(false)
  const streamRef = useRef<AbortableAsyncIterator<ChatResponse> | null>(null)
  const [markdown, setMarkdown] = useState(false)

  const onSystemPromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessages((prev) => {
      return [
        {
          role: 'system',
          content: e.target.value,
        },
        ...(prev.slice(1) ?? []),
      ]
    })
  }

  const onCurrentRoleChange = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()

    setCurrentMessage(
      (prev) =>
        ({
          role: prev.role === 'user' ? 'assistant' : 'user',
          content: prev.content,
        }) satisfies Message
    )
  }

  const onCurrentMessageChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setCurrentMessage((prev) => ({
      role: prev.role,
      content: e.target.value,
    }))
  }

  const onAddClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    setMessages((prev) => {
      return [...prev, currentMessage]
    })
    setCurrentMessage({
      role: 'user',
      content: '',
    })
  }

  const onMessageSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setLoading(true)
    try {
      // Add the current message to the request
      const request =
        currentMessage.content !== ''
          ? [...messages, currentMessage]
          : [...messages]

      // Reset the current message
      setCurrentMessage({
        role: 'user',
        content: '',
      })

      // Send the request to ollama
      streamRef.current = await ollama.chat({
        model: 'llama3.2',
        stream: true,
        messages: request,
      } satisfies ChatRequest & { stream: true })

      let i = 0
      for await (const response of streamRef.current) {
        // Create a new message with the response
        if (i === 0) {
          setMessages([
            ...request,
            {
              role: 'assistant',
              content: response.message.content,
            },
          ])

          // Update the last message
        } else {
          setMessages((prev) => {
            const lastMessage = [...prev].pop()
            return [
              ...prev.slice(0, -1),
              {
                role: 'assistant',
                content: `${lastMessage?.content}${response.message.content}`,
              },
            ]
          })
        }
        i++
      }
    } finally {
      setLoading(false)
    }
  }

  const onMessageChange =
    (index: number) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessages((prev) => {
        const messages = [...prev]
        messages[index + 1] = {
          role: messages[index + 1].role,
          content: e.target.value,
        }
        return messages
      })
    }

  const onDeleteMessageClick =
    (index: number) => (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()
      setMessages((prev) => {
        return prev.slice(0, index + 1)
      })
    }

  const onCancelClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()

    if (streamRef.current != null) {
      try {
        streamRef.current.abort()
      } catch {}
    }
  }

  const onMarkdownToggled = (checked: boolean) => {
    setMarkdown(checked)
  }

  return (
    <div className="w-full h-[calc(100vh-7rem)] relative gap-4 flex flex-col">
      <div className="w-full flex justify-end">
        <div className="flex items-center space-x-2">
          <Switch checked={markdown} onCheckedChange={onMarkdownToggled} />
          <Label>Markdown</Label>
        </div>
      </div>
      <form onSubmit={onMessageSubmit}>
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 flex-col">
            <Label htmlFor="system" className="text-md">
              System
            </Label>
            <Textarea
              id="system"
              placeholder={SYSTEM_PROMPT_PLACEHOLDER}
              value={messages[0].content}
              onChange={onSystemPromptChange}
            />
          </div>
          {messages.slice(1).map((message, index) => {
            return (
              <div key={index} className="flex gap-2 flex-col">
                <Label className="text-md capitalize">{message.role}</Label>
                <div className="flex flex-col gap-4 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  {markdown ? (
                    <Markdown>{message.content}</Markdown>
                  ) : (
                    <textarea
                      className="w-full h-full flex flex-col gap-4 min-h-[80px] w-full rounded-md bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      onChange={onMessageChange(index)}
                      value={message.content}
                    />
                  )}
                  <div className="w-full flex justify-end">
                    <Button
                      onClick={onDeleteMessageClick(index)}
                      variant="ghost"
                      size="icon"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                        />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <div className="flex flex-col gap-4 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
            <textarea
              onChange={onCurrentMessageChange}
              value={currentMessage.content}
              className="w-full h-full flex flex-col gap-4 min-h-[80px] w-full rounded-md bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={USER_PROMPT_PLACEHOLDER}
            />
            <div className="flex justify-between items-center">
              <div>
                <Button
                  className="capitalize"
                  variant="secondary"
                  onClick={onCurrentRoleChange}
                >
                  {currentMessage.role}
                </Button>
              </div>
              <div className="flex gap-2">
                {loading ? (
                  <Button onClick={onCancelClick}>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z"
                      />
                    </svg>
                    &nbsp;Stop
                  </Button>
                ) : (
                  <>
                    <Button variant="secondary" onClick={onAddClick}>
                      Add
                    </Button>
                    <Button type="submit">Run</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
