"use client"

import { useState, useEffect, useRef } from "react"
import { PlusCircle, Trash2, Clock, AlertCircle, Plus, Minus, Pause, Play, Edit, Check, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { Toaster } from "sonner"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

// Process class type
type ProcessClass = "deadline" | "realtime" | "normal"

// Real-time scheduling algorithm
type RTSchedulingAlgorithm = "fifo" | "rr"

// Routine type
type RoutineType = "default" | "daily"

// Task type definition with scheduling properties
type Task = {
  id: string
  title: string
  description: string
  priority: number
  createdAt: Date
  startedAt?: Date
  processClass: ProcessClass
  // Deadline process properties
  deadline?: Date
  // Real-time process properties
  rtAlgorithm?: RTSchedulingAlgorithm
  // Normal process properties (CFS)
  niceValue?: number
  vruntime?: number
  routineType?: RoutineType
  // Common properties
  timeQuantum: number // in minutes
  elapsedTime: number // in seconds
  isPaused?: boolean
}

// Completed task type
type CompletedTask = {
  id: string
  title: string
  description: string
  processClass: ProcessClass
  completedAt: Date
  totalTime: number // in seconds
  deadline?: Date
  rtAlgorithm?: RTSchedulingAlgorithm
  niceValue?: number
  routineType?: RoutineType
}

// Radio group value type
type RadioGroupValue = RTSchedulingAlgorithm | RoutineType

// Slider value type
type SliderValue = number[]

export default function Home() {
  // State for tasks and current task
  const [tasks, setTasks] = useState<Task[]>(() => {
    // Initialize with some example tasks if in browser
    if (typeof window !== "undefined") {
      const savedTasks = localStorage.getItem("tasks")
      if (savedTasks) {
        return JSON.parse(savedTasks, (key, value) => {
          if (key === "createdAt" || key === "startedAt" || key === "deadline") {
            return value ? new Date(value) : null
          }
          return value
        })
      }
    }
    return []
  })

  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>(() => {
    if (typeof window !== "undefined") {
      const savedCompletedTasks = localStorage.getItem("completedTasks")
      if (savedCompletedTasks) {
        return JSON.parse(savedCompletedTasks, (key, value) => {
          if (key === "completedAt" || key === "deadline") {
            return value ? new Date(value) : null
          }
          return value
        })
      }
    }
    return []
  })

  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState<string>("")
  const [newTaskDescription, setNewTaskDescription] = useState<string>("")
  const [newTaskProcessClass, setNewTaskProcessClass] = useState<ProcessClass>("normal")
  const [newTaskDeadline, setNewTaskDeadline] = useState<string>(() => {
    const date = new Date()
    date.setDate(date.getDate() + 7) // Default deadline: 7 days from now
    return date.toISOString().split("T")[0]
  })
  const [newTaskRTAlgorithm, setNewTaskRTAlgorithm] = useState<RTSchedulingAlgorithm>("fifo")
  const [newTaskNiceValue, setNewTaskNiceValue] = useState<number>(0)
  const [newTaskTimeQuantum, setNewTaskTimeQuantum] = useState<number>(60)  // Default 60 minutes
  const [elapsedTime, setElapsedTime] = useState<number>(0)
  const [newTaskRoutineType, setNewTaskRoutineType] = useState<RoutineType>("default")
  const [newTaskDeadlineTime, setNewTaskDeadlineTime] = useState<string>("12:00")

  // State for dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false)
  const [isTaskSwitchDialogOpen, setIsTaskSwitchDialogOpen] = useState<boolean>(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [taskToSwitch, setTaskToSwitch] = useState<string | null>(null)
  const [completedDailyRoutines, setCompletedDailyRoutines] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const savedCompletedRoutines = localStorage.getItem("completedDailyRoutines")
      if (savedCompletedRoutines) {
        return JSON.parse(savedCompletedRoutines)
      }
    }
    return []
  })

  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Complete a task
  const completeTask = (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    // For daily routine tasks, add to completedDailyRoutines instead of removing
    if (task.processClass === "normal" && task.routineType === "daily") {
      setCompletedDailyRoutines((prev) => {
        const updated = [...prev, task.id]
        localStorage.setItem("completedDailyRoutines", JSON.stringify(updated))
        return updated
      })

      // If it's the current task, clear it
      if (currentTask?.id === id) {
        setCurrentTask(null)
      }

      toast.success("Daily Routine Completed", {
        description: `"${task.title}" has been completed for today.`,
      })

      return
    }

    // For non-daily routine tasks, proceed as before
    // Add to completed tasks
    const completedTask: CompletedTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      processClass: task.processClass,
      completedAt: new Date(),
      totalTime: task.elapsedTime,
      deadline: task.deadline,
      rtAlgorithm: task.rtAlgorithm,
      niceValue: task.niceValue,
      routineType: task.routineType,
    }

    setCompletedTasks([completedTask, ...completedTasks])

    // Remove from tasks
    setTasks(tasks.filter((t) => t.id !== id))

    if (currentTask?.id === id) {
      setCurrentTask(null)
    }

    // Show notification
    toast.success("Task Completed", {
      description: `"${task.title}" has been completed.`,
    })
  }

  // Calculate weight based on nice value (CFS formula)
  const calculateWeight = (niceValue: number): number => {
    // In CFS, weight is calculated as 1024 / (1.25^nice)
    return 1024 / Math.pow(1.25, niceValue || 0)
  }

  // Calculate virtual runtime for normal processes
  const calculateVRuntime = (elapsedTimeSeconds: number, niceValue: number): number => {
    return Math.floor(Math.pow(1.25, niceValue || 0) * elapsedTimeSeconds)
  }

  // Get time until deadline in seconds
  const getTimeUntilDeadline = (deadline: Date): number => {
    const now = new Date()
    return Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000))
  }

  // Format deadline display
  const formatDeadline = (deadline: Date): string => {
    const now = new Date()
    const diffTime = deadline.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const timeStr = deadline.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    if (diffDays <= 0) {
      return `Overdue! (${timeStr})`
    } else if (diffDays === 1) {
      return `Due tomorrow at ${timeStr}`
    } else if (diffDays < 7) {
      return `Due in ${diffDays} days at ${timeStr}`
    } else {
      return `${new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(deadline)} at ${timeStr}`
    }
  }

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks))

    // Set the current task to the highest priority task if none is selected
    if (!currentTask && tasks.length > 0) {
      // Get the next task based on scheduling priority
      const nextTask = getNextTaskToRun()

      if (nextTask) {
        startTask(nextTask.id)
      }
    }
  }, [tasks, currentTask])

  // Save completed tasks to localStorage
  useEffect(() => {
    localStorage.setItem("completedTasks", JSON.stringify(completedTasks))
  }, [completedTasks])

  // Timer logic for updating elapsed time
  useEffect(() => {
    if (!currentTask?.startedAt || currentTask?.isPaused) return

    // Clear any existing interval first to prevent multiple timers
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Store the current elapsed time when starting the timer
    const initialElapsedTime = currentTask.elapsedTime
    const startTime = Date.now()

    timerRef.current = setInterval(() => {
      // Calculate elapsed time as initial time plus seconds since timer started
      const secondsElapsed = Math.floor((Date.now() - startTime) / 1000)
      const totalElapsed = initialElapsedTime + secondsElapsed

      // Check if time quantum is reached
      if (totalElapsed >= currentTask.timeQuantum * 60) {
        // Stop the timer
        clearInterval(timerRef.current!)

        // Set elapsed time to exactly the time quantum
        const finalElapsedTime = currentTask.timeQuantum * 60
        setElapsedTime(finalElapsedTime)

        // Update task with final elapsed time
        setTasks((prevTasks) =>
          prevTasks.map((task) => {
            if (task.id === currentTask.id) {
              const updatedTask = {
                ...task,
                elapsedTime: finalElapsedTime,
              }

              // Update vruntime for normal processes
              if (task.processClass === "normal" && task.niceValue !== undefined) {
                updatedTask.vruntime = calculateVRuntime(finalElapsedTime, task.niceValue)
              }

              return updatedTask
            }
            return task
          }),
        )

        // Update current task state
        setCurrentTask((prevTask) => {
          if (!prevTask) return null

          const updatedTask = {
            ...prevTask,
            elapsedTime: finalElapsedTime,
          }

          // Update vruntime for normal processes
          if (prevTask.processClass === "normal" && prevTask.niceValue !== undefined) {
            updatedTask.vruntime = calculateVRuntime(finalElapsedTime, prevTask.niceValue)
          }

          return updatedTask
        })

        // Always show task switch dialog when time quantum is reached
        setTimeout(() => {
          setIsTaskSwitchDialogOpen(true)
          setTaskToSwitch(null) // Indicate time quantum reached
        }, 100)

        return
      }

      setElapsedTime(totalElapsed)

      // Update the current task's elapsed time and vruntime
      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          if (task.id === currentTask.id) {
            const updatedTask = {
              ...task,
              elapsedTime: totalElapsed,
            }

            // Update vruntime for normal processes
            if (task.processClass === "normal" && task.niceValue !== undefined) {
              updatedTask.vruntime = calculateVRuntime(totalElapsed, task.niceValue)
            }

            return updatedTask
          }
          return task
        }),
      )

      // Also update the currentTask state
      setCurrentTask((prevTask) => {
        if (!prevTask) return null

        const updatedTask = {
          ...prevTask,
          elapsedTime: totalElapsed,
        }

        // Update vruntime for normal processes
        if (prevTask.processClass === "normal" && prevTask.niceValue !== undefined) {
          updatedTask.vruntime = calculateVRuntime(totalElapsed, prevTask.niceValue)
        }

        return updatedTask
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [currentTask])

  // Reset form fields
  const resetFormFields = () => {
    setNewTaskTitle("")
    setNewTaskDescription("")
    setNewTaskProcessClass("normal")

    const date = new Date()
    date.setDate(date.getDate() + 7) // Default deadline: 7 days from now
    setNewTaskDeadline(date.toISOString().split("T")[0])
    setNewTaskDeadlineTime("12:00")

    setNewTaskRTAlgorithm("fifo")
    setNewTaskNiceValue(0)
    setNewTaskTimeQuantum(60)
    setNewTaskRoutineType("default")
  }

  // Add a new task
  const addTask = () => {
    if (!newTaskTitle.trim()) return

    const newTask: Task = {
      id: Date.now().toString(),
      title: newTaskTitle,
      description: newTaskDescription,
      priority: tasks.length + 1,
      createdAt: new Date(),
      processClass: newTaskProcessClass,
      timeQuantum: newTaskTimeQuantum,
      elapsedTime: 0,
    }

    // Add class-specific properties
    if (newTaskProcessClass === "deadline") {
      const deadlineDate = new Date(newTaskDeadline)
      const [hours, minutes] = newTaskDeadlineTime.split(":").map(Number)
      deadlineDate.setHours(hours, minutes)
      newTask.deadline = deadlineDate
    } else if (newTaskProcessClass === "realtime") {
      newTask.rtAlgorithm = newTaskRTAlgorithm
    } else if (newTaskProcessClass === "normal") {
      newTask.niceValue = newTaskNiceValue
      newTask.vruntime = 0
      newTask.routineType = newTaskRoutineType
    }

    setTasks([...tasks, newTask])

    // Show notification
    toast.success("Task Added", {
      description: `"${newTaskTitle}" has been added to your ${newTaskProcessClass} tasks.`,
    })

    resetFormFields()
  }

  // Edit a task
  const editTask = () => {
    if (!taskToEdit || !newTaskTitle.trim()) return

    setTasks(
      tasks.map((task) => {
        if (task.id === taskToEdit.id) {
          const updatedTask: Task = {
            ...task,
            title: newTaskTitle,
            description: newTaskDescription,
            processClass: newTaskProcessClass,
            timeQuantum: newTaskTimeQuantum,
          }

          // Update class-specific properties
          if (newTaskProcessClass === "deadline") {
            updatedTask.deadline = new Date(newTaskDeadline)
            // Remove properties from other classes
            delete updatedTask.rtAlgorithm
            delete updatedTask.niceValue
            delete updatedTask.vruntime
          } else if (newTaskProcessClass === "realtime") {
            updatedTask.rtAlgorithm = newTaskRTAlgorithm
            // Remove properties from other classes
            delete updatedTask.deadline
            delete updatedTask.niceValue
            delete updatedTask.vruntime
          } else if (newTaskProcessClass === "normal") {
            // Recalculate vruntime if nice value changed
            const newVruntime =
              task.processClass === "normal" && task.niceValue !== newTaskNiceValue
                ? calculateVRuntime(task.elapsedTime, newTaskNiceValue)
                : task.processClass === "normal"
                  ? task.vruntime
                  : 0

            updatedTask.niceValue = newTaskNiceValue
            updatedTask.vruntime = newVruntime
            updatedTask.routineType = newTaskRoutineType
            // Remove properties from other classes
            delete updatedTask.deadline
            delete updatedTask.rtAlgorithm
          }

          return updatedTask
        }
        return task
      }),
    )

    // If we're editing the current task, update it too
    if (currentTask?.id === taskToEdit.id) {
      setCurrentTask((prev) => {
        if (!prev) return null

        const updatedTask: Task = {
          ...prev,
          title: newTaskTitle,
          description: newTaskDescription,
          processClass: newTaskProcessClass,
          timeQuantum: newTaskTimeQuantum,
        }

        // Update class-specific properties
        if (newTaskProcessClass === "deadline") {
          updatedTask.deadline = new Date(newTaskDeadline)
          // Remove properties from other classes
          delete updatedTask.rtAlgorithm
          delete updatedTask.niceValue
          delete updatedTask.vruntime
        } else if (newTaskProcessClass === "realtime") {
          updatedTask.rtAlgorithm = newTaskRTAlgorithm
          // Remove properties from other classes
          delete updatedTask.deadline
          delete updatedTask.niceValue
          delete updatedTask.vruntime
        } else if (newTaskProcessClass === "normal") {
          // Recalculate vruntime if nice value changed
          const newVruntime =
            prev.processClass === "normal" && prev.niceValue !== newTaskNiceValue
              ? calculateVRuntime(prev.elapsedTime, newTaskNiceValue)
              : prev.processClass === "normal"
                ? prev.vruntime
                : 0

          updatedTask.niceValue = newTaskNiceValue
          updatedTask.vruntime = newVruntime
          updatedTask.routineType = newTaskRoutineType
          // Remove properties from other classes
          delete updatedTask.deadline
          delete updatedTask.rtAlgorithm
        }

        return updatedTask
      })
    }

    // Show notification
    toast.success("Task Updated", {
      description: `"${newTaskTitle}" has been updated.`,
    })

    setIsEditDialogOpen(false)
    setTaskToEdit(null)
    resetFormFields()
  }

  // Open edit dialog
  const openEditDialog = (task: Task) => {
    setTaskToEdit(task)
    setNewTaskTitle(task.title)
    setNewTaskDescription(task.description)
    setNewTaskProcessClass(task.processClass)
    setNewTaskTimeQuantum(task.timeQuantum)

    // Set class-specific properties
    if (task.processClass === "deadline" && task.deadline) {
      setNewTaskDeadline(task.deadline.toISOString().split("T")[0])
      const hours = task.deadline.getHours().toString().padStart(2, "0")
      const minutes = task.deadline.getMinutes().toString().padStart(2, "0")
      setNewTaskDeadlineTime(`${hours}:${minutes}`)
    } else if (task.processClass === "realtime" && task.rtAlgorithm) {
      setNewTaskRTAlgorithm(task.rtAlgorithm)
    } else if (task.processClass === "normal") {
      setNewTaskNiceValue(task.niceValue || 0)
      setNewTaskRoutineType(task.routineType || "default")
    }

    setIsEditDialogOpen(true)
  }

  // Delete a task
  const deleteTask = (id: string) => {
    setTaskToDelete(id)
    setIsDeleteDialogOpen(true)
  }

  // Confirm delete task
  const confirmDeleteTask = () => {
    if (!taskToDelete) return

    if (currentTask?.id === taskToDelete) {
      setCurrentTask(null)
    }

    setTasks(tasks.filter((task) => task.id !== taskToDelete))

    // Show notification
    toast.error("Task Deleted", {
      description: "The task has been deleted.",
    })

    setIsDeleteDialogOpen(false)
    setTaskToDelete(null)
  }

  // Delete a completed task
  const deleteCompletedTask = (id: string) => {
    setCompletedTasks(completedTasks.filter((task) => task.id !== id))

    // Show notification
    toast.error("Completed Task Deleted", {
      description: "The completed task has been deleted.",
    })
  }

  // Get the next task to run based on Linux scheduling priority
  const getNextTaskToRun = (): Task | undefined => {
    // 1. First check for deadline tasks (EDF - Earliest Deadline First)
    const deadlineTasks = tasks.filter((task) => task.processClass === "deadline" && task.deadline && !task.startedAt)

    if (deadlineTasks.length > 0) {
      // Sort by earliest deadline
      return deadlineTasks.sort((a, b) => {
        if (!a.deadline || !b.deadline) return 0
        return a.deadline.getTime() - b.deadline.getTime()
      })[0]
    }

    // 2. Then check for real-time tasks
    const realtimeTasks = tasks.filter((task) => task.processClass === "realtime" && !task.startedAt)

    if (realtimeTasks.length > 0) {
      // For FIFO, return the first task that was added
      // For RR, we could implement more complex logic, but for simplicity, we'll use the same approach
      return realtimeTasks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0]
    }

    // 3. Finally, check for normal tasks (CFS)
    const normalTasks = tasks.filter((task) => task.processClass === "normal" && !task.startedAt)

    if (normalTasks.length > 0) {
      // Sort by lowest vruntime
      return normalTasks.sort((a, b) => (a.vruntime || 0) - (b.vruntime || 0))[0]
    }

    return undefined
  }

  // Start a task
  const startTask = (id: string) => {
    // If there's a current task, ask for confirmation
    if (currentTask && currentTask.id !== id) {
      setTaskToSwitch(id)
      setIsTaskSwitchDialogOpen(true)
      return
    }

    performTaskSwitch(id)
  }

  // Perform task switch
  const performTaskSwitch = (id: string) => {
    // If there's a current task, return it to the list
    if (currentTask && currentTask.id !== id) {
      setTasks(
        tasks.map((task) => {
          if (task.id === currentTask.id) {
            return {
              ...task,
              startedAt: undefined,
              isPaused: false,
            }
          }
          return task
        }),
      )
    }

    // Start the new task
    setTasks(
      tasks.map((task) => {
        if (task.id === id) {
          return {
            ...task,
            startedAt: new Date(),
            isPaused: false,
          }
        }
        return task
      }),
    )

    const taskToStart = tasks.find((task) => task.id === id)
    if (taskToStart) {
      setCurrentTask({
        ...taskToStart,
        startedAt: new Date(),
        isPaused: false,
      })
      setElapsedTime(taskToStart.elapsedTime)
    }

    setIsTaskSwitchDialogOpen(false)
    setTaskToSwitch(null)
  }

  // Pause current task
  const pauseTask = () => {
    if (!currentTask) return

    // Update current task
    setCurrentTask({
      ...currentTask,
      isPaused: true,
    })

    // Update tasks list
    setTasks(
      tasks.map((task) => {
        if (task.id === currentTask.id) {
          return {
            ...task,
            isPaused: true,
          }
        }
        return task
      }),
    )

    // Clear interval
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    toast.info("Task Paused", {
      description: `"${currentTask.title}" has been paused.`,
    })
  }

  // Resume current task
  const resumeTask = () => {
    if (!currentTask) return

    const now = new Date()

    // Update current task
    setCurrentTask({
      ...currentTask,
      startedAt: now,
      isPaused: false,
    })

    // Update tasks list
    setTasks(
      tasks.map((task) => {
        if (task.id === currentTask.id) {
          return {
            ...task,
            startedAt: now,
            isPaused: false,
          }
        }
        return task
      }),
    )

    toast.info("Task Resumed", {
      description: `"${currentTask.title}" has been resumed.`,
    })
  }

  // Add time quantum to current task
  const addTimeQuantum = (minutes: number) => {
    if (!currentTask) return

    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === currentTask.id) {
          return {
            ...task,
            timeQuantum: task.timeQuantum + minutes,
          }
        }
        return task
      }),
    )

    setCurrentTask((prevTask) => {
      if (!prevTask) return null
      return {
        ...prevTask,
        timeQuantum: prevTask.timeQuantum + minutes,
      }
    })

    toast.success("Time Quantum Added", {
      description: `Added ${minutes} minutes to "${currentTask.title}".`,
    })
  }

  // Subtract time quantum from current task
  const subtractTimeQuantum = (minutes: number) => {
    if (!currentTask) return

    const remainingSeconds = currentTask.timeQuantum * 60 - currentTask.elapsedTime
    const remainingMinutes = Math.ceil(remainingSeconds / 60)

    if (minutes > remainingMinutes) {
      toast.error("Cannot Reduce Time", {
        description: `You cannot remove more than the remaining time (${remainingMinutes} minutes).`,
      })
      return
    }

    const newTimeQuantum = Math.max(1, currentTask.timeQuantum - minutes)

    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.id === currentTask.id) {
          return {
            ...task,
            timeQuantum: newTimeQuantum,
          }
        }
        return task
      }),
    )

    setCurrentTask((prevTask) => {
      if (!prevTask) return null
      return {
        ...prevTask,
        timeQuantum: newTimeQuantum,
      }
    })

    toast.success("Time Quantum Reduced", {
      description: `Reduced ${minutes} minutes from "${currentTask.title}".`,
    })
  }

  // Format time display
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Format date display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // Get prioritized tasks for the ready queue based on Linux scheduling
  const getReadyQueueTasks = (): Task[] => {
    const tasksWithoutCurrent = tasks.filter((task) => {
      // Filter out current task and completed daily routines
      return (
        task.id !== currentTask?.id &&
        !(task.processClass === "normal" && task.routineType === "daily" && completedDailyRoutines.includes(task.id))
      )
    })

    // 1. First, deadline tasks sorted by earliest deadline
    const deadlineTasks = tasksWithoutCurrent
      .filter((task) => task.processClass === "deadline" && task.deadline)
      .sort((a, b) => {
        if (!a.deadline || !b.deadline) return 0
        return a.deadline.getTime() - b.deadline.getTime()
      })

    // 2. Then, real-time tasks sorted by creation time (FIFO)
    const realtimeTasks = tasksWithoutCurrent
      .filter((task) => task.processClass === "realtime")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

    // 3. Finally, normal tasks sorted by vruntime
    const normalTasks = tasksWithoutCurrent
      .filter((task) => task.processClass === "normal")
      .sort((a, b) => (a.vruntime || 0) - (b.vruntime || 0))

    // Combine all tasks in priority order
    return [...deadlineTasks, ...realtimeTasks, ...normalTasks].slice(0, 10)
  }

  // Get tasks by process class
  const getTasksByProcessClass = (processClass: ProcessClass) => {
    return tasks.filter((task) => task.processClass === processClass)
  }

  // Calculate progress percentage
  const calculateProgress = (task: Task | null): number => {
    if (!task) return 0
    const totalSeconds = task.timeQuantum * 60
    const progress = (task.elapsedTime / totalSeconds) * 100
    return Math.min(progress, 100)
  }

  // Get badge color based on process class
  const getProcessClassBadgeColor = (processClass: ProcessClass): string => {
    switch (processClass) {
      case "deadline":
        return "bg-red-100 text-red-800 border-red-200"
      case "realtime":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "normal":
        return "bg-sky-100 text-sky-800 border-sky-200"
      default:
        return ""
    }
  }

  // Get process class display name
  const getProcessClassDisplayName = (processClass: ProcessClass): string => {
    switch (processClass) {
      case "deadline":
        return "Deadline"
      case "realtime":
        return "Real-Time"
      case "normal":
        return "Normal"
      default:
        return processClass
    }
  }

  // Finish current task
  const finishCurrentTask = () => {
    if (!currentTask) return

    completeTask(currentTask.id)
  }

  // Reset daily routines at 5 AM
  useEffect(() => {
    const checkForReset = () => {
      const now = new Date()
      if (now.getHours() === 5 && now.getMinutes() === 0) {
        // Reset all daily routines
        setCompletedDailyRoutines([])
        localStorage.setItem("completedDailyRoutines", JSON.stringify([]))

        toast.info("Daily Routines Reset", {
          description: "All daily routines have been reset for the new day.",
        })
      }
    }

    // Check every minute
    const intervalId = setInterval(checkForReset, 60000)

    return () => clearInterval(intervalId)
  }, [])

  // Get ready queue tasks
  const readyQueueTasks = getReadyQueueTasks()

  return (
    <main className="container mx-auto p-4 space-y-6">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-bold text-center mb-8">Linux-Like TODO Management (for Engineers)</h1>

      {/* Current Task Section */}
      <Card className="border-2 border-sky-500">
        <CardHeader className="bg-sky-100">
          <CardTitle className="flex justify-between items-center">
            <span>Current Task (CPU Process)</span>
            <Badge variant="outline" className="ml-2 text-sm">
              <Clock className="h-4 w-4 mr-1" />
              {formatTime(elapsedTime)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {currentTask ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{currentTask.title}</h3>
                  <p className="text-muted-foreground mt-1">{currentTask.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={getProcessClassBadgeColor(currentTask.processClass)}>
                    {getProcessClassDisplayName(currentTask.processClass)}
                  </Badge>

                  {currentTask.processClass === "deadline" && currentTask.deadline && (
                    <Badge variant="outline" className="text-red-600">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDeadline(currentTask.deadline)}
                    </Badge>
                  )}

                  {currentTask.processClass === "realtime" && currentTask.rtAlgorithm && (
                    <Badge variant="outline">Algorithm: {currentTask.rtAlgorithm.toUpperCase()}</Badge>
                  )}

                  {currentTask.processClass === "normal" && currentTask.niceValue !== undefined && (
                    <>
                      <Badge variant="outline">Nice: {currentTask.niceValue}</Badge>
                      <Badge variant="secondary">VRuntime: {currentTask.vruntime?.toLocaleString() || 0}</Badge>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress ({Math.round(calculateProgress(currentTask))}%)</span>
                  <span>
                    {formatTime(currentTask.elapsedTime)} / {formatTime(currentTask.timeQuantum * 60)}
                  </span>
                </div>
                <Progress value={calculateProgress(currentTask)} className="h-2" />
              </div>

              <div className="flex justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium mb-2">Add Time Quantum:</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => addTimeQuantum(5)}>
                      <Plus className="h-3 w-3 mr-1" /> 5min
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addTimeQuantum(15)}>
                      <Plus className="h-3 w-3 mr-1" /> 15min
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addTimeQuantum(30)}>
                      <Plus className="h-3 w-3 mr-1" /> 30min
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addTimeQuantum(60)}>
                      <Plus className="h-3 w-3 mr-1" /> 60min
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 flex-1">
                  <p className="text-sm font-medium mb-2">Sub Time Quantum:</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => subtractTimeQuantum(5)}>
                      <Minus className="h-3 w-3 mr-1" /> 5min
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => subtractTimeQuantum(15)}>
                      <Minus className="h-3 w-3 mr-1" /> 15min
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => subtractTimeQuantum(30)}>
                      <Minus className="h-3 w-3 mr-1" /> 30min
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => subtractTimeQuantum(60)}>
                      <Minus className="h-3 w-3 mr-1" /> 60min
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-2">
                {currentTask.isPaused ? (
                  <Button onClick={resumeTask} className="w-32">
                    <Play className="h-4 w-4 mr-2" /> Resume
                  </Button>
                ) : (
                  <Button onClick={pauseTask} className="w-32">
                    <Pause className="h-4 w-4 mr-2" /> Pause
                  </Button>
                )}
                <Button onClick={finishCurrentTask} variant="outline" className="w-32">
                  <Check className="h-4 w-4 mr-2" /> Finish
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground/70" />
              <p className="text-lg">No task currently in progress</p>
              <p className="max-w-md mt-2">Start a task from the ready queue below to begin tracking your work</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ready Queue Section */}
      <Card>
        <CardHeader>
          <CardTitle>Ready Queue (Sorted by Scheduling Priority)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px] pr-4">
            {readyQueueTasks.length > 0 ? (
              <div className="space-y-2">
                {readyQueueTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-card hover:bg-accent/50 border"
                  >
                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                      <Badge className={getProcessClassBadgeColor(task.processClass)}>
                        {getProcessClassDisplayName(task.processClass)}
                      </Badge>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          {task.processClass === "deadline" && task.deadline && (
                            <span>Deadline: {formatDeadline(task.deadline)}</span>
                          )}
                          {task.processClass === "realtime" && task.rtAlgorithm && (
                            <span>Algorithm: {task.rtAlgorithm.toUpperCase()}</span>
                          )}
                          {task.processClass === "normal" && (
                            <>
                              <span>Nice: {task.niceValue}</span>
                              <span>•</span>
                              <span>VRuntime: {task.vruntime?.toLocaleString() || 0}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2 w-full sm:w-auto justify-end">
                      <Button variant="outline" size="sm" onClick={() => startTask(task.id)}>
                        Start
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(task)}>
                        <Edit className="h-4 w-4 text-sky-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <p>No tasks in the ready queue</p>
                <p className="text-sm mt-1">Add tasks below to get started</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* All Processes Section */}
      <Card>
        <CardHeader>
          <CardTitle>All Processes</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="deadline">Deadline</TabsTrigger>
              <TabsTrigger value="realtime">Real-Time</TabsTrigger>
              <TabsTrigger value="normal">Normal</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Deadline column */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Deadline Processes</h3>
                    <Dialog
                      open={isAddDialogOpen && newTaskProcessClass === "deadline"}
                      onOpenChange={(open) => {
                        setIsAddDialogOpen(open)
                        if (open) setNewTaskProcessClass("deadline")
                        if (!open) resetFormFields()
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <PlusCircle className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Deadline Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="deadline-title">Title</Label>
                            <Input
                              id="deadline-title"
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              placeholder="Enter task title"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="deadline-description">Description</Label>
                            <Input
                              id="deadline-description"
                              value={newTaskDescription}
                              onChange={(e) => setNewTaskDescription(e.target.value)}
                              placeholder="Enter task description"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="deadline-date">Deadline Date</Label>
                            <Input
                              id="deadline-date"
                              type="date"
                              value={newTaskDeadline}
                              onChange={(e) => setNewTaskDeadline(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="deadline-time">Deadline Time</Label>
                            <Input
                              id="deadline-time"
                              type="time"
                              value={newTaskDeadlineTime}
                              onChange={(e) => setNewTaskDeadlineTime(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="deadline-quantum">Time Quantum (minutes): {newTaskTimeQuantum}</Label>
                            <Input
                              id="deadline-quantum"
                              type="number"
                              min={1}
                              value={newTaskTimeQuantum}
                              onChange={(e) => setNewTaskTimeQuantum(Number.parseInt(e.target.value) || 60)}
                            />
                          </div>
                          <Button
                            onClick={() => {
                              addTask()
                              setIsAddDialogOpen(false)
                            }}
                            className="w-full"
                          >
                            Add Task
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {getTasksByProcessClass("deadline").map((task) => (
                        <div
                          key={task.id}
                          className={`p-2 border rounded-md flex justify-between items-center ${
                            currentTask?.id === task.id ? "bg-red-50" : ""
                          }`}
                        >
                          <div className="truncate max-w-[70%]">
                            <span className="text-sm font-medium">{task.title}</span>
                            <div className="text-xs text-muted-foreground">
                              {task.deadline && <span>Deadline: {formatDeadline(task.deadline)}</span>}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            {currentTask?.id !== task.id && (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openEditDialog(task)}
                                >
                                  <Edit className="h-3 w-3 text-sky-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => deleteTask(task.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      {getTasksByProcessClass("deadline").length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No deadline tasks</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Real-time column */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Real-Time Processes</h3>
                    <Dialog
                      open={isAddDialogOpen && newTaskProcessClass === "realtime"}
                      onOpenChange={(open) => {
                        setIsAddDialogOpen(open)
                        if (open) setNewTaskProcessClass("realtime")
                        if (!open) resetFormFields()
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <PlusCircle className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Real-Time Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="realtime-title">Title</Label>
                            <Input
                              id="realtime-title"
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              placeholder="Enter task title"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="realtime-description">Description</Label>
                            <Input
                              id="realtime-description"
                              value={newTaskDescription}
                              onChange={(e) => setNewTaskDescription(e.target.value)}
                              placeholder="Enter task description"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="realtime-algorithm">Scheduling Algorithm</Label>
                            <RadioGroup
                              id="realtime-algorithm"
                              value={newTaskRTAlgorithm}
                              onValueChange={(value: RadioGroupValue) => setNewTaskRTAlgorithm(value as RTSchedulingAlgorithm)}
                              className="flex flex-col space-y-1"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="fifo" id="fifo" />
                                <Label htmlFor="fifo">FIFO (First In, First Out)</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="rr" id="rr" />
                                <Label htmlFor="rr">RR (Round Robin)</Label>
                              </div>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="realtime-quantum">Time Quantum (minutes): {newTaskTimeQuantum}</Label>
                            <Input
                              id="realtime-quantum"
                              type="number"
                              min={1}
                              value={newTaskTimeQuantum}
                              onChange={(e) => setNewTaskTimeQuantum(Number.parseInt(e.target.value) || 60)}
                            />
                          </div>
                          <Button
                            onClick={() => {
                              addTask()
                              setIsAddDialogOpen(false)
                            }}
                            className="w-full"
                          >
                            Add Task
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {getTasksByProcessClass("realtime").map((task) => (
                        <div
                          key={task.id}
                          className={`p-2 border rounded-md flex justify-between items-center ${
                            currentTask?.id === task.id ? "bg-purple-50" : ""
                          }`}
                        >
                          <div className="truncate max-w-[70%]">
                            <span className="text-sm font-medium">{task.title}</span>
                            <div className="text-xs text-muted-foreground">
                              Algorithm: {task.rtAlgorithm?.toUpperCase() || "FIFO"}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            {currentTask?.id !== task.id && (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openEditDialog(task)}
                                >
                                  <Edit className="h-3 w-3 text-sky-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => deleteTask(task.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      {getTasksByProcessClass("realtime").length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No real-time tasks</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Normal column */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">
                      Normal Processes (CFS)
                      <span className="text-xs text-gray-400 font-normal block">Daily Routine</span>
                    </h3>
                    <Dialog
                      open={isAddDialogOpen && newTaskProcessClass === "normal"}
                      onOpenChange={(open) => {
                        setIsAddDialogOpen(open)
                        if (open) setNewTaskProcessClass("normal")
                        if (!open) resetFormFields()
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <PlusCircle className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add Normal Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="normal-title">Title</Label>
                            <Input
                              id="normal-title"
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              placeholder="Enter task title"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="normal-description">Description</Label>
                            <Input
                              id="normal-description"
                              value={newTaskDescription}
                              onChange={(e) => setNewTaskDescription(e.target.value)}
                              placeholder="Enter task description"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label htmlFor="normal-nice">Nice Value: {newTaskNiceValue}</Label>
                              <span className="text-xs text-muted-foreground">(-20 to +19)</span>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="pt-2 pb-1">
                                    <Slider
                                      id="normal-nice"
                                      min={-20}
                                      max={19}
                                      step={1}
                                      value={[newTaskNiceValue]}
                                      onValueChange={(value: number[]) => setNewTaskNiceValue(value[0])}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Lower values get higher priority</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="normal-routine-type">Routine Type</Label>
                            <RadioGroup
                              id="normal-routine-type"
                              value={newTaskRoutineType}
                              onValueChange={(value: RadioGroupValue) => setNewTaskRoutineType(value as "default" | "daily")}
                              className="flex flex-col space-y-1"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="default" id="default" />
                                <Label htmlFor="default">Default (One-time task)</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="daily" id="daily" />
                                <Label htmlFor="daily">Daily Routine (Resets at 5 AM)</Label>
                              </div>
                            </RadioGroup>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="normal-quantum">Time Quantum (minutes): {newTaskTimeQuantum}</Label>
                            <Input
                              id="normal-quantum"
                              type="number"
                              min={1}
                              value={newTaskTimeQuantum}
                              onChange={(e) => setNewTaskTimeQuantum(Number.parseInt(e.target.value) || 60)}
                            />
                          </div>
                          <Button
                            onClick={() => {
                              addTask()
                              setIsAddDialogOpen(false)
                            }}
                            className="w-full"
                          >
                            Add Task
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {getTasksByProcessClass("normal").map((task) => (
                        <div
                          key={task.id}
                          className={`p-2 border rounded-md flex justify-between items-center ${
                            currentTask?.id === task.id ? "bg-[#e0f2fe]" : ""
                          }`}
                        >
                          <div className="truncate max-w-[70%]">
                            <span className="text-sm font-medium">{task.title}</span>
                            <div className="text-xs text-muted-foreground">
                              Nice: {task.niceValue} | VRuntime: {task.vruntime?.toLocaleString() || 0}
                            </div>
                          </div>
                          <div className="flex space-x-1">
                            {currentTask?.id !== task.id && (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openEditDialog(task)}
                                >
                                  <Edit className="h-3 w-3 text-sky-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => deleteTask(task.id)}
                                >
                                  <Trash2 className="h-3 w-3 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      {getTasksByProcessClass("normal").length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No normal tasks</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="deadline">
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Deadline Processes (EDF)</h3>
                  <Dialog
                    open={isAddDialogOpen && newTaskProcessClass === "deadline"}
                    onOpenChange={(open) => {
                      setIsAddDialogOpen(open)
                      if (open) setNewTaskProcessClass("deadline")
                      if (!open) resetFormFields()
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Deadline Task</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="deadline-title-tab">Title</Label>
                          <Input
                            id="deadline-title-tab"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Enter task title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deadline-description-tab">Description</Label>
                          <Input
                            id="deadline-description-tab"
                            value={newTaskDescription}
                            onChange={(e) => setNewTaskDescription(e.target.value)}
                            placeholder="Enter task description"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deadline-date-tab">Deadline Date</Label>
                          <Input
                            id="deadline-date-tab"
                            type="date"
                            value={newTaskDeadline}
                            onChange={(e) => setNewTaskDeadline(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deadline-time-tab">Deadline Time</Label>
                          <Input
                            id="deadline-time-tab"
                            type="time"
                            value={newTaskDeadlineTime}
                            onChange={(e) => setNewTaskDeadlineTime(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="deadline-quantum-tab">Time Quantum (minutes): {newTaskTimeQuantum}</Label>
                          <Input
                            id="deadline-quantum-tab"
                            type="number"
                            min={1}
                            value={newTaskTimeQuantum}
                            onChange={(e) => setNewTaskTimeQuantum(Number.parseInt(e.target.value) || 60)}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            addTask()
                            setIsAddDialogOpen(false)
                          }}
                          className="w-full"
                        >
                          Add Task
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {getTasksByProcessClass("deadline").map((task) => (
                    <Card key={task.id} className={`overflow-hidden ${currentTask?.id === task.id ? "bg-red-50" : ""}`}>
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex justify-between">
                          <span className="truncate">{task.title}</span>
                          <div className="flex space-x-1">
                            {currentTask?.id !== task.id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 -mr-2 -mt-1"
                                  onClick={() => openEditDialog(task)}
                                >
                                  <Edit className="h-4 w-4 text-sky-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 -mr-2 -mt-1"
                                  onClick={() => deleteTask(task.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                        <div className="flex flex-col gap-2 mt-3">
                          <div className="flex justify-between items-center">
                            {task.deadline && (
                              <Badge variant="outline" className="text-xs text-red-600">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDeadline(task.deadline)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className="text-xs">
                              Time: {formatTime(task.timeQuantum * 60)}
                            </Badge>
                            {currentTask?.id !== task.id && (
                              <Button variant="outline" size="sm" onClick={() => startTask(task.id)}>
                                Start
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {getTasksByProcessClass("deadline").length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <p>No deadline tasks available</p>
                      <p className="text-sm mt-1">Add a new task to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="realtime">
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Real-Time Processes (FIFO/RR)</h3>
                  <Dialog
                    open={isAddDialogOpen && newTaskProcessClass === "realtime"}
                    onOpenChange={(open) => {
                      setIsAddDialogOpen(open)
                      if (open) setNewTaskProcessClass("realtime")
                      if (!open) resetFormFields()
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Real-Time Task</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="realtime-title-tab">Title</Label>
                          <Input
                            id="realtime-title-tab"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Enter task title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="realtime-description-tab">Description</Label>
                          <Input
                            id="realtime-description-tab"
                            value={newTaskDescription}
                            onChange={(e) => setNewTaskDescription(e.target.value)}
                            placeholder="Enter task description"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="realtime-algorithm-tab">Scheduling Algorithm</Label>
                          <RadioGroup
                            id="realtime-algorithm-tab"
                            value={newTaskRTAlgorithm}
                            onValueChange={(value: RadioGroupValue) => setNewTaskRTAlgorithm(value as RTSchedulingAlgorithm)}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="fifo" id="fifo-tab" />
                              <Label htmlFor="fifo-tab">FIFO (First In, First Out)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="rr" id="rr-tab" />
                              <Label htmlFor="rr-tab">RR (Round Robin)</Label>
                            </div>
                          </RadioGroup>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="realtime-quantum-tab">Time Quantum (minutes): {newTaskTimeQuantum}</Label>
                          <Input
                            id="realtime-quantum-tab"
                            type="number"
                            min={1}
                            value={newTaskTimeQuantum}
                            onChange={(e) => setNewTaskTimeQuantum(Number.parseInt(e.target.value) || 60)}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            addTask()
                            setIsAddDialogOpen(false)
                          }}
                          className="w-full"
                        >
                          Add Task
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {getTasksByProcessClass("realtime").map((task) => (
                    <Card
                      key={task.id}
                      className={`overflow-hidden ${currentTask?.id === task.id ? "bg-purple-50" : ""}`}
                    >
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex justify-between">
                          <span className="truncate">{task.title}</span>
                          <div className="flex space-x-1">
                            {currentTask?.id !== task.id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 -mr-2 -mt-1"
                                  onClick={() => openEditDialog(task)}
                                >
                                  <Edit className="h-4 w-4 text-sky-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 -mr-2 -mt-1"
                                  onClick={() => deleteTask(task.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                        <div className="flex flex-col gap-2 mt-3">
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className="text-xs">
                              Algorithm: {task.rtAlgorithm?.toUpperCase() || "FIFO"}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className="text-xs">
                              Time: {formatTime(task.timeQuantum * 60)}
                            </Badge>
                            {currentTask?.id !== task.id && (
                              <Button variant="outline" size="sm" onClick={() => startTask(task.id)}>
                                Start
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {getTasksByProcessClass("realtime").length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <p>No real-time tasks available</p>
                      <p className="text-sm mt-1">Add a new task to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="normal">
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Normal Processes (CFS)</h3>
                  <Dialog
                    open={isAddDialogOpen && newTaskProcessClass === "normal"}
                    onOpenChange={(open) => {
                      setIsAddDialogOpen(open)
                      if (open) setNewTaskProcessClass("normal")
                      if (!open) resetFormFields()
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Normal Task</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="normal-title-tab">Title</Label>
                          <Input
                            id="normal-title-tab"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Enter task title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="normal-description-tab">Description</Label>
                          <Input
                            id="normal-description-tab"
                            value={newTaskDescription}
                            onChange={(e) => setNewTaskDescription(e.target.value)}
                            placeholder="Enter task description"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label htmlFor="normal-nice-tab">Nice Value: {newTaskNiceValue}</Label>
                            <span className="text-xs text-muted-foreground">(-20 to +19)</span>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="pt-2 pb-1">
                                  <Slider
                                    id="normal-nice-tab"
                                    min={-20}
                                    max={19}
                                    step={1}
                                    value={[newTaskNiceValue]}
                                    onValueChange={(value: number[]) => setNewTaskNiceValue(value[0])}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Lower values get higher priority</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="normal-quantum-tab">Time Quantum (minutes): {newTaskTimeQuantum}</Label>
                          <Input
                            id="normal-quantum-tab"
                            type="number"
                            min={1}
                            value={newTaskTimeQuantum}
                            onChange={(e) => setNewTaskTimeQuantum(Number.parseInt(e.target.value) || 60)}
                          />
                        </div>
                        <Button
                          onClick={() => {
                            addTask()
                            setIsAddDialogOpen(false)
                          }}
                          className="w-full"
                        >
                          Add Task
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {getTasksByProcessClass("normal").map((task) => (
                    <Card
                      key={task.id}
                      className={`overflow-hidden ${currentTask?.id === task.id ? "bg-[#e0f2fe]" : ""}`}
                    >
                      <CardHeader className="p-4">
                        <CardTitle className="text-base flex justify-between">
                          <span className="truncate">{task.title}</span>
                          <div className="flex space-x-1">
                            {currentTask?.id !== task.id && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 -mr-2 -mt-1"
                                  onClick={() => openEditDialog(task)}
                                >
                                  <Edit className="h-4 w-4 text-sky-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 -mr-2 -mt-1"
                                  onClick={() => deleteTask(task.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                        <div className="flex flex-col gap-2 mt-3">
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className="text-xs">
                              Nice: {task.niceValue}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              VRuntime: {task.vruntime?.toLocaleString() || 0}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className="text-xs">
                              Time: {formatTime(task.timeQuantum * 60)}
                            </Badge>
                            {currentTask?.id !== task.id && (
                              <Button variant="outline" size="sm" onClick={() => startTask(task.id)}>
                                Start
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {getTasksByProcessClass("normal").length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <p>No normal tasks available</p>
                      <p className="text-sm mt-1">Add a new task to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Completed Tasks Section */}
      <Card>
        <CardHeader>
          <CardTitle>Completed Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[250px] pr-4">
            {completedTasks.length > 0 ? (
              <div className="space-y-2">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg flex justify-between items-center ${
                      task.processClass === "deadline"
                        ? "bg-red-50 border-red-200"
                        : task.processClass === "realtime"
                          ? "bg-purple-50 border-purple-200"
                          : "bg-sky-50 border-sky-200"
                    } border`}
                  >
                    <div className="flex items-center space-x-3">
                      <Check className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>{getProcessClassDisplayName(task.processClass)}</span>
                          <span>•</span>
                          {task.processClass === "deadline" && task.deadline && (
                            <>
                              <span>Deadline: {formatDate(task.deadline)}</span>
                              <span>•</span>
                            </>
                          )}
                          {task.processClass === "realtime" && task.rtAlgorithm && (
                            <>
                              <span>Algorithm: {task.rtAlgorithm.toUpperCase()}</span>
                              <span>•</span>
                            </>
                          )}
                          {task.processClass === "normal" && task.niceValue !== undefined && (
                            <>
                              <span>Nice: {task.niceValue}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>Completed: {formatDate(task.completedAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="ml-2">
                        Total Time: {formatTime(task.totalTime)}
                      </Badge>
                      <Button variant="ghost" size="icon" onClick={() => deleteCompletedTask(task.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <p>No completed tasks yet</p>
                <p className="text-sm mt-1">Complete tasks to see them here</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Enter task title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                placeholder="Enter task description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-process-class">Process Class</Label>
              <select
                id="edit-process-class"
                className="w-full p-2 border rounded-md"
                value={newTaskProcessClass}
                onChange={(e) => setNewTaskProcessClass(e.target.value as ProcessClass)}
              >
                <option value="deadline">Deadline</option>
                <option value="realtime">Real-Time</option>
                <option value="normal">Normal</option>
              </select>
            </div>

            {/* Class-specific fields */}
            {newTaskProcessClass === "deadline" && (
              <div className="space-y-2">
                <Label htmlFor="edit-deadline">Deadline Date</Label>
                <Input
                  id="edit-deadline"
                  type="date"
                  value={newTaskDeadline}
                  onChange={(e) => setNewTaskDeadline(e.target.value)}
                />
              </div>
            )}

            {newTaskProcessClass === "realtime" && (
              <div className="space-y-2">
                <Label htmlFor="edit-rt-algorithm">Scheduling Algorithm</Label>
                <RadioGroup
                  id="edit-rt-algorithm"
                  value={newTaskRTAlgorithm}
                  onValueChange={(value: RadioGroupValue) => setNewTaskRTAlgorithm(value as RTSchedulingAlgorithm)}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fifo" id="edit-fifo" />
                    <Label htmlFor="edit-fifo">FIFO (First In, First Out)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="rr" id="edit-rr" />
                    <Label htmlFor="edit-rr">RR (Round Robin)</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {newTaskProcessClass === "normal" && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="edit-nice">Nice Value: {newTaskNiceValue}</Label>
                  <span className="text-xs text-muted-foreground">(-20 to +19)</span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="pt-2 pb-1">
                        <Slider
                          id="edit-nice"
                          min={-20}
                          max={19}
                          step={1}
                          value={[newTaskNiceValue]}
                          onChange={(value: number[]) => setNewTaskNiceValue(value[0])}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Lower values get higher priority</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-quantum">Time Quantum (minutes): {newTaskTimeQuantum}</Label>
              <Input
                id="edit-quantum"
                type="number"
                min={1}
                value={newTaskTimeQuantum}
                onChange={(e) => setNewTaskTimeQuantum(Number.parseInt(e.target.value) || 60)}
              />
            </div>
            <Button onClick={editTask} className="w-full">
              Update Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} className="bg-red-500 hover:bg-red-600">
              Yes, delete task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Task Switch Confirmation Dialog */}
      <AlertDialog open={isTaskSwitchDialogOpen} onOpenChange={setIsTaskSwitchDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{taskToSwitch ? "Switch Task?" : "Time Quantum Reached"}</AlertDialogTitle>
            <AlertDialogDescription>
              {taskToSwitch
                ? "Do you want to stop the current task and start a new one?"
                : "The time quantum for the current task has been reached."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (!taskToSwitch) {
                  // Add 5 minutes to current task
                  addTimeQuantum(5)
                }
                setIsTaskSwitchDialogOpen(false)
                setTaskToSwitch(null)
              }}
            >
              {taskToSwitch ? "Cancel" : "Add 5 minutes of Time Quantum"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (taskToSwitch) {
                  performTaskSwitch(taskToSwitch)
                } else {
                  // End task and switch to next
                  if (currentTask) {
                    const currentTaskId = currentTask.id

                    // Store the next task before removing the current one
                    const tasksWithoutCurrent = tasks.filter((task) => task.id !== currentTaskId)
                    const nextTask = getNextTaskToRun()

                    // First update the tasks state to remove the current task
                    setTasks(tasksWithoutCurrent)

                    // Then clear the current task
                    setCurrentTask(null)

                    // Add to completed tasks
                    const taskToComplete = tasks.find((t) => t.id === currentTaskId)
                    if (taskToComplete) {
                      const completedTask: CompletedTask = {
                        id: taskToComplete.id,
                        title: taskToComplete.title,
                        description: taskToComplete.description,
                        processClass: taskToComplete.processClass,
                        completedAt: new Date(),
                        totalTime: taskToComplete.elapsedTime,
                        deadline: taskToComplete.deadline,
                        rtAlgorithm: taskToComplete.rtAlgorithm,
                        niceValue: taskToComplete.niceValue,
                        routineType: taskToComplete.routineType,
                      }

                      setCompletedTasks((prev) => [completedTask, ...prev])

                      // Show notification
                      toast.success("Task Completed", {
                        description: `"${taskToComplete.title}" has been completed.`,
                      })
                    }

                    // Start the next task if available
                    if (nextTask) {
                      setTimeout(() => {
                        startTask(nextTask.id)
                      }, 100)
                    }
                  }
                  setIsTaskSwitchDialogOpen(false)
                }
              }}
            >
              {taskToSwitch ? "Yes, Switch Task" : "End task and switch to next"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}