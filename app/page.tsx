"use client"

import { useState, useEffect, useRef } from "react"
import { PlusCircle, Trash2, Clock, AlertCircle, Plus, Minus, Pause, Play, Edit, Check } from "lucide-react"
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
import { toast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

// Task type definition with nice value and time quantum
type Task = {
  id: string
  title: string
  description: string
  priority: number
  createdAt: Date
  startedAt?: Date
  category: "long-term" | "medium-term" | "short-term"
  niceValue: number
  timeQuantum: number // in minutes
  elapsedTime: number // in seconds
  vruntime: number // virtual runtime
  isPaused?: boolean
}

// Completed task type
type CompletedTask = {
  id: string
  title: string
  description: string
  category: "long-term" | "medium-term" | "short-term"
  completedAt: Date
  totalTime: number // in seconds
  niceValue: number
}

export default function Home() {
  // State for tasks and current task
  const [tasks, setTasks] = useState<Task[]>(() => {
    // Initialize with some example tasks if in browser
    if (typeof window !== "undefined") {
      const savedTasks = localStorage.getItem("tasks")
      if (savedTasks) {
        return JSON.parse(savedTasks, (key, value) => {
          if (key === "createdAt" || key === "startedAt") {
            return value ? new Date(value) : null
          }
          return value
        })
      }
    }

    return [
      {
        id: "1",
        title: "Complete project proposal",
        description: "Draft and finalize the project proposal for the client",
        priority: 1,
        createdAt: new Date(),
        startedAt: new Date(Date.now() - 1000 * 60 * 30), // Started 30 minutes ago
        category: "short-term",
        niceValue: 0,
        timeQuantum: 60, // 60 minutes
        elapsedTime: 30 * 60, // 30 minutes in seconds
        vruntime: 30 * 60 * 1024, // basic vruntime calculation
      },
      {
        id: "2",
        title: "Research market trends",
        description: "Analyze current market trends for the upcoming strategy meeting",
        priority: 2,
        createdAt: new Date(),
        category: "medium-term",
        niceValue: -5,
        timeQuantum: 120, // 120 minutes
        elapsedTime: 0,
        vruntime: 0,
      },
      {
        id: "3",
        title: "Learn a new programming language",
        description: "Study and practice a new programming language for skill development",
        priority: 3,
        createdAt: new Date(),
        category: "long-term",
        niceValue: 10,
        timeQuantum: 240, // 240 minutes
        elapsedTime: 0,
        vruntime: 0,
      },
    ]
  })

  // State for completed tasks
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>(() => {
    if (typeof window !== "undefined") {
      const savedCompletedTasks = localStorage.getItem("completedTasks")
      if (savedCompletedTasks) {
        return JSON.parse(savedCompletedTasks, (key, value) => {
          if (key === "completedAt") {
            return value ? new Date(value) : null
          }
          return value
        })
      }
    }
    return []
  })

  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskDescription, setNewTaskDescription] = useState("")
  const [newTaskCategory, setNewTaskCategory] = useState<"long-term" | "medium-term" | "short-term">("short-term")
  const [newTaskNiceValue, setNewTaskNiceValue] = useState(0)
  const [newTaskTimeQuantum, setNewTaskTimeQuantum] = useState(60) // Default 60 minutes
  const [elapsedTime, setElapsedTime] = useState(0)

  // State for dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isTaskSwitchDialogOpen, setIsTaskSwitchDialogOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null)
  const [taskToSwitch, setTaskToSwitch] = useState<string | null>(null)

  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Complete a task
  const completeTask = (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    // Add to completed tasks
    const completedTask: CompletedTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      completedAt: new Date(),
      totalTime: task.elapsedTime,
      niceValue: task.niceValue,
    }

    setCompletedTasks([completedTask, ...completedTasks])

    // Remove from tasks
    setTasks(tasks.filter((t) => t.id !== id))

    if (currentTask?.id === id) {
      setCurrentTask(null)
    }

    // Show notification
    toast({
      title: "Task Completed",
      description: `"${task.title}" has been completed.`,
      variant: "default",
    })
  }

  // Calculate weight based on nice value (CFS formula)
  const calculateWeight = (niceValue: number): number => {
    // In CFS, weight is calculated as 1024 / (1.25^nice)
    return 1024 / Math.pow(1.25, niceValue)
  }

  // Fix the vruntime calculation formula to match: vruntime = 1.25^(nice value) × (task execution time)
  // Replace the calculateVRuntime function with:

  const calculateVRuntime = (elapsedTimeSeconds: number, niceValue: number): number => {
    return Math.floor(Math.pow(1.25, niceValue) * elapsedTimeSeconds)
  }

  // Calculate virtual runtime
  // const calculateVRuntime = (elapsedTimeSeconds: number, niceValue: number): number => {
  //   const weight = calculateWeight(niceValue)
  //   return Math.floor(elapsedTimeSeconds * (1024 / weight))
  // }

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks))

    // Set the current task to the highest priority task if none is selected
    if (!currentTask && tasks.length > 0) {
      const highestPriorityTask = [...tasks]
        .filter((task) => !task.startedAt)
        .sort((a, b) => a.vruntime - b.vruntime)[0]

      if (highestPriorityTask) {
        startTask(highestPriorityTask.id)
      }
    }
  }, [tasks, currentTask])

  // Save completed tasks to localStorage
  useEffect(() => {
    localStorage.setItem("completedTasks", JSON.stringify(completedTasks))
  }, [completedTasks])

  // Fix the timer logic to increment exactly 1 second per second
  // Replace the useEffect for updating elapsed time with this simplified version:

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
              return {
                ...task,
                elapsedTime: finalElapsedTime,
                vruntime: calculateVRuntime(finalElapsedTime, task.niceValue),
              }
            }
            return task
          }),
        )

        // Update current task state
        setCurrentTask((prevTask) => {
          if (!prevTask) return null
          return {
            ...prevTask,
            elapsedTime: finalElapsedTime,
            vruntime: calculateVRuntime(finalElapsedTime, prevTask.niceValue),
          }
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
            return {
              ...task,
              elapsedTime: totalElapsed,
              vruntime: calculateVRuntime(totalElapsed, task.niceValue),
            }
          }
          return task
        }),
      )

      // Also update the currentTask state
      setCurrentTask((prevTask) => {
        if (!prevTask) return null
        return {
          ...prevTask,
          elapsedTime: totalElapsed,
          vruntime: calculateVRuntime(totalElapsed, prevTask.niceValue),
        }
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
    setNewTaskCategory("short-term")
    setNewTaskNiceValue(0)
    setNewTaskTimeQuantum(60)
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
      category: newTaskCategory,
      niceValue: newTaskNiceValue,
      timeQuantum: newTaskTimeQuantum,
      elapsedTime: 0,
      vruntime: 0,
    }

    setTasks([...tasks, newTask])

    // Show notification
    toast({
      title: "Task Added",
      description: `"${newTaskTitle}" has been added to your ${newTaskCategory} tasks.`,
    })

    resetFormFields()
  }

  // Also update the editTask function to recalculate vruntime when nice value changes:
  // Replace the editTask function with:

  // Edit a task
  const editTask = () => {
    if (!taskToEdit || !newTaskTitle.trim()) return

    setTasks(
      tasks.map((task) => {
        if (task.id === taskToEdit.id) {
          // Recalculate vruntime if nice value changed
          const newVruntime =
            task.niceValue !== newTaskNiceValue ? calculateVRuntime(task.elapsedTime, newTaskNiceValue) : task.vruntime

          const updatedTask = {
            ...task,
            title: newTaskTitle,
            description: newTaskDescription,
            category: newTaskCategory,
            niceValue: newTaskNiceValue,
            timeQuantum: newTaskTimeQuantum,
            vruntime: newVruntime,
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

        const newVruntime =
          prev.niceValue !== newTaskNiceValue ? calculateVRuntime(prev.elapsedTime, newTaskNiceValue) : prev.vruntime

        return {
          ...prev,
          title: newTaskTitle,
          description: newTaskDescription,
          category: newTaskCategory,
          niceValue: newTaskNiceValue,
          timeQuantum: newTaskTimeQuantum,
          vruntime: newVruntime,
        }
      })
    }

    // Show notification
    toast({
      title: "Task Updated",
      description: `"${newTaskTitle}" has been updated.`,
    })

    setIsEditDialogOpen(false)
    setTaskToEdit(null)
    resetFormFields()
  }

  // Edit a task
  // const editTask = () => {
  //   if (!taskToEdit || !newTaskTitle.trim()) return

  //   setTasks(
  //     tasks.map((task) => {
  //       if (task.id === taskToEdit.id) {
  //         const updatedTask = {
  //           ...task,
  //           title: newTaskTitle,
  //           description: newTaskDescription,
  //           category: newTaskCategory,
  //           niceValue: newTaskNiceValue,
  //           timeQuantum: newTaskTimeQuantum,
  //         }
  //         return updatedTask
  //       }
  //       return task
  //     }),
  //   )

  //   // Show notification
  //   toast({
  //     title: "Task Updated",
  //     description: `"${newTaskTitle}" has been updated.`,
  //   })

  //   setIsEditDialogOpen(false)
  //   setTaskToEdit(null)
  //   resetFormFields()
  // }

  // Open edit dialog
  const openEditDialog = (task: Task) => {
    setTaskToEdit(task)
    setNewTaskTitle(task.title)
    setNewTaskDescription(task.description)
    setNewTaskCategory(task.category)
    setNewTaskNiceValue(task.niceValue)
    setNewTaskTimeQuantum(task.timeQuantum)
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
    toast({
      title: "Task Deleted",
      description: "The task has been deleted.",
      variant: "destructive",
    })

    setIsDeleteDialogOpen(false)
    setTaskToDelete(null)
  }

  // Delete a completed task
  const deleteCompletedTask = (id: string) => {
    setCompletedTasks(completedTasks.filter((task) => task.id !== id))

    // Show notification
    toast({
      title: "Completed Task Deleted",
      description: "The completed task has been deleted.",
      variant: "destructive",
    })
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

    toast({
      title: "Task Paused",
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

    toast({
      title: "Task Resumed",
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

    toast({
      title: "Time Quantum Added",
      description: `Added ${minutes} minutes to "${currentTask.title}".`,
    })
  }

  // Subtract time quantum from current task
  const subtractTimeQuantum = (minutes: number) => {
    if (!currentTask) return

    const remainingSeconds = currentTask.timeQuantum * 60 - currentTask.elapsedTime
    const remainingMinutes = Math.ceil(remainingSeconds / 60)

    if (minutes > remainingMinutes) {
      toast({
        title: "Cannot Reduce Time",
        description: `You cannot remove more than the remaining time (${remainingMinutes} minutes).`,
        variant: "destructive",
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

    toast({
      title: "Time Quantum Reduced",
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

  // Get prioritized tasks for the ready queue sorted by vruntime
  const readyQueueTasks = [...tasks]
    .filter((task) => task.id !== currentTask?.id) // Exclude current task
    .sort((a, b) => a.vruntime - b.vruntime)
    .slice(0, 10)

  // Get tasks by category
  const getTasksByCategory = (category: "long-term" | "medium-term" | "short-term") => {
    return tasks.filter((task) => task.category === category)
  }

  // Calculate progress percentage
  const calculateProgress = (task: Task | null): number => {
    if (!task) return 0
    const totalSeconds = task.timeQuantum * 60
    const progress = (task.elapsedTime / totalSeconds) * 100
    return Math.min(progress, 100)
  }

  return (
    <main className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-8">CFS-Based TODO Management (for Engineers)</h1>

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
                  <Badge>Priority: {currentTask.priority}</Badge>
                  <Badge variant="outline">Nice: {currentTask.niceValue}</Badge>
                  <Badge variant="secondary">VRuntime: {currentTask.vruntime.toLocaleString()}</Badge>
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

              <div className="pt-2 flex justify-center">
                {currentTask.isPaused ? (
                  <Button onClick={resumeTask} className="w-32">
                    <Play className="h-4 w-4 mr-2" /> Resume
                  </Button>
                ) : (
                  <Button onClick={pauseTask} className="w-32">
                    <Pause className="h-4 w-4 mr-2" /> Pause
                  </Button>
                )}
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
          <CardTitle>Ready Queue (Sorted by Virtual Runtime)</CardTitle>
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
                      <Badge variant="outline" className="h-6 w-6 flex items-center justify-center p-0">
                        {task.priority}
                      </Badge>
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>{task.category.replace("-", " ")}</span>
                          <span>•</span>
                          <span>Nice: {task.niceValue}</span>
                          <span>•</span>
                          <span>VRuntime: {task.vruntime.toLocaleString()}</span>
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
              <TabsTrigger value="long-term">Long-term</TabsTrigger>
              <TabsTrigger value="medium-term">Medium-term</TabsTrigger>
              <TabsTrigger value="short-term">Short-term</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Long-term column */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Long-term Processes (Daily Routine)</h3>
                    <Dialog
                      open={isAddDialogOpen && newTaskCategory === "long-term"}
                      onOpenChange={(open) => {
                        setIsAddDialogOpen(open)
                        if (open) setNewTaskCategory("long-term")
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
                          <DialogTitle>Add Long-term Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="long-term-title">Title</Label>
                            <Input
                              id="long-term-title"
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              placeholder="Enter task title"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="long-term-description">Description</Label>
                            <Input
                              id="long-term-description"
                              value={newTaskDescription}
                              onChange={(e) => setNewTaskDescription(e.target.value)}
                              placeholder="Enter task description"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label htmlFor="long-term-nice">Nice Value: {newTaskNiceValue}</Label>
                              <span className="text-xs text-muted-foreground">(-20 to +19)</span>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="pt-2 pb-1">
                                    <Slider
                                      id="long-term-nice"
                                      min={-20}
                                      max={19}
                                      step={1}
                                      value={[newTaskNiceValue]}
                                      onValueChange={(value) => setNewTaskNiceValue(value[0])}
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
                            <Label htmlFor="long-term-quantum">Time Quantum (minutes): {newTaskTimeQuantum}</Label>
                            <Input
                              id="long-term-quantum"
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
                      {getTasksByCategory("long-term").map((task) => (
                        <div
                          key={task.id}
                          className={`p-2 border rounded-md flex justify-between items-center ${
                            currentTask?.id === task.id ? "bg-[#e0f2fe]" : ""
                          }`}
                        >
                          <div className="truncate max-w-[70%]">
                            <span className="text-sm font-medium">{task.title}</span>
                            <div className="text-xs text-muted-foreground">
                              Nice: {task.niceValue} | VRuntime: {task.vruntime.toLocaleString()}
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
                      {getTasksByCategory("long-term").length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No long-term tasks</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Medium-term column */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Medium-term Processes</h3>
                    <Dialog
                      open={isAddDialogOpen && newTaskCategory === "medium-term"}
                      onOpenChange={(open) => {
                        setIsAddDialogOpen(open)
                        if (open) setNewTaskCategory("medium-term")
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
                          <DialogTitle>Add Medium-term Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="medium-term-title">Title</Label>
                            <Input
                              id="medium-term-title"
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              placeholder="Enter task title"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="medium-term-description">Description</Label>
                            <Input
                              id="medium-term-description"
                              value={newTaskDescription}
                              onChange={(e) => setNewTaskDescription(e.target.value)}
                              placeholder="Enter task description"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label htmlFor="medium-term-nice">Nice Value: {newTaskNiceValue}</Label>
                              <span className="text-xs text-muted-foreground">(-20 to +19)</span>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="pt-2 pb-1">
                                    <Slider
                                      id="medium-term-nice"
                                      min={-20}
                                      max={19}
                                      step={1}
                                      value={[newTaskNiceValue]}
                                      onValueChange={(value) => setNewTaskNiceValue(value[0])}
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
                            <Label htmlFor="medium-term-quantum">Time Quantum (minutes): {newTaskTimeQuantum}</Label>
                            <Input
                              id="medium-term-quantum"
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
                      {getTasksByCategory("medium-term").map((task) => (
                        <div
                          key={task.id}
                          className={`p-2 border rounded-md flex justify-between items-center ${
                            currentTask?.id === task.id ? "bg-[#e0f2fe]" : ""
                          }`}
                        >
                          <div className="truncate max-w-[70%]">
                            <span className="text-sm font-medium">{task.title}</span>
                            <div className="text-xs text-muted-foreground">
                              Nice: {task.niceValue} | VRuntime: {task.vruntime.toLocaleString()}
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
                      {getTasksByCategory("medium-term").length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No medium-term tasks</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                {/* Short-term column */}
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Short-term Processes</h3>
                    <Dialog
                      open={isAddDialogOpen && newTaskCategory === "short-term"}
                      onOpenChange={(open) => {
                        setIsAddDialogOpen(open)
                        if (open) setNewTaskCategory("short-term")
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
                          <DialogTitle>Add Short-term Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="short-term-title">Title</Label>
                            <Input
                              id="short-term-title"
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              placeholder="Enter task title"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="short-term-description">Description</Label>
                            <Input
                              id="short-term-description"
                              value={newTaskDescription}
                              onChange={(e) => setNewTaskDescription(e.target.value)}
                              placeholder="Enter task description"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <Label htmlFor="short-term-nice">Nice Value: {newTaskNiceValue}</Label>
                              <span className="text-xs text-muted-foreground">(-20 to +19)</span>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="pt-2 pb-1">
                                    <Slider
                                      id="short-term-nice"
                                      min={-20}
                                      max={19}
                                      step={1}
                                      value={[newTaskNiceValue]}
                                      onValueChange={(value) => setNewTaskNiceValue(value[0])}
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
                            <Label htmlFor="short-term-quantum">Time Quantum (minutes): {newTaskTimeQuantum}</Label>
                            <Input
                              id="short-term-quantum"
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
                      {getTasksByCategory("short-term").map((task) => (
                        <div
                          key={task.id}
                          className={`p-2 border rounded-md flex justify-between items-center ${
                            currentTask?.id === task.id ? "bg-[#e0f2fe]" : ""
                          }`}
                        >
                          <div className="truncate max-w-[70%]">
                            <span className="text-sm font-medium">{task.title}</span>
                            <div className="text-xs text-muted-foreground">
                              Nice: {task.niceValue} | VRuntime: {task.vruntime.toLocaleString()}
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
                      {getTasksByCategory("short-term").length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No short-term tasks</p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="long-term">
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Long-term Processes (Daily Routine)</h3>
                  <Dialog
                    open={isAddDialogOpen && newTaskCategory === "long-term"}
                    onOpenChange={(open) => {
                      setIsAddDialogOpen(open)
                      if (open) setNewTaskCategory("long-term")
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
                        <DialogTitle>Add Long-term Task</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="long-term-title-tab">Title</Label>
                          <Input
                            id="long-term-title-tab"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Enter task title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="long-term-description-tab">Description</Label>
                          <Input
                            id="long-term-description-tab"
                            value={newTaskDescription}
                            onChange={(e) => setNewTaskDescription(e.target.value)}
                            placeholder="Enter task description"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label htmlFor="long-term-nice-tab">Nice Value: {newTaskNiceValue}</Label>
                            <span className="text-xs text-muted-foreground">(-20 to +19)</span>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="pt-2 pb-1">
                                  <Slider
                                    id="long-term-nice-tab"
                                    min={-20}
                                    max={19}
                                    step={1}
                                    value={[newTaskNiceValue]}
                                    onValueChange={(value) => setNewTaskNiceValue(value[0])}
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
                          <Label htmlFor="long-term-quantum-tab">Time Quantum (minutes): {newTaskTimeQuantum}</Label>
                          <Input
                            id="long-term-quantum-tab"
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
                  {getTasksByCategory("long-term").map((task) => (
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
                              VRuntime: {task.vruntime.toLocaleString()}
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
                  {getTasksByCategory("long-term").length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <p>No long-term tasks available</p>
                      <p className="text-sm mt-1">Add a new task to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="medium-term">
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Medium-term Processes</h3>
                  <Dialog
                    open={isAddDialogOpen && newTaskCategory === "medium-term"}
                    onOpenChange={(open) => {
                      setIsAddDialogOpen(open)
                      if (open) setNewTaskCategory("medium-term")
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
                        <DialogTitle>Add Medium-term Task</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="medium-term-title-tab">Title</Label>
                          <Input
                            id="medium-term-title-tab"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Enter task title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="medium-term-description-tab">Description</Label>
                          <Input
                            id="medium-term-description-tab"
                            value={newTaskDescription}
                            onChange={(e) => setNewTaskDescription(e.target.value)}
                            placeholder="Enter task description"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label htmlFor="medium-term-nice-tab">Nice Value: {newTaskNiceValue}</Label>
                            <span className="text-xs text-muted-foreground">(-20 to +19)</span>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="pt-2 pb-1">
                                  <Slider
                                    id="medium-term-nice-tab"
                                    min={-20}
                                    max={19}
                                    step={1}
                                    value={[newTaskNiceValue]}
                                    onValueChange={(value) => setNewTaskNiceValue(value[0])}
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
                          <Label htmlFor="medium-term-quantum-tab">Time Quantum (minutes): {newTaskTimeQuantum}</Label>
                          <Input
                            id="medium-term-quantum-tab"
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
                  {getTasksByCategory("medium-term").map((task) => (
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
                              VRuntime: {task.vruntime.toLocaleString()}
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
                  {getTasksByCategory("medium-term").length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <p>No medium-term tasks available</p>
                      <p className="text-sm mt-1">Add a new task to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="short-term">
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">Short-term Processes</h3>
                  <Dialog
                    open={isAddDialogOpen && newTaskCategory === "short-term"}
                    onOpenChange={(open) => {
                      setIsAddDialogOpen(open)
                      if (open) setNewTaskCategory("short-term")
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
                        <DialogTitle>Add Short-term Task</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="short-term-title-tab">Title</Label>
                          <Input
                            id="short-term-title-tab"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            placeholder="Enter task title"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="short-term-description-tab">Description</Label>
                          <Input
                            id="short-term-description-tab"
                            value={newTaskDescription}
                            onChange={(e) => setNewTaskDescription(e.target.value)}
                            placeholder="Enter task description"
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label htmlFor="short-term-nice-tab">Nice Value: {newTaskNiceValue}</Label>
                            <span className="text-xs text-muted-foreground">(-20 to +19)</span>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="pt-2 pb-1">
                                  <Slider
                                    id="short-term-nice-tab"
                                    min={-20}
                                    max={19}
                                    step={1}
                                    value={[newTaskNiceValue]}
                                    onValueChange={(value) => setNewTaskNiceValue(value[0])}
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
                          <Label htmlFor="short-term-quantum-tab">Time Quantum (minutes): {newTaskTimeQuantum}</Label>
                          <Input
                            id="short-term-quantum-tab"
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
                  {getTasksByCategory("short-term").map((task) => (
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
                              VRuntime: {task.vruntime.toLocaleString()}
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
                  {getTasksByCategory("short-term").length === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <p>No short-term tasks available</p>
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
                    className="p-3 rounded-lg flex justify-between items-center bg-sky-50 border border-sky-200"
                  >
                    <div className="flex items-center space-x-3">
                      <Check className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>{task.category.replace("-", " ")}</span>
                          <span>•</span>
                          <span>Nice: {task.niceValue}</span>
                          <span>•</span>
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
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
                className="w-full p-2 border rounded-md"
                value={newTaskCategory}
                onChange={(e) => setNewTaskCategory(e.target.value as "long-term" | "medium-term" | "short-term")}
              >
                <option value="long-term">Long-term</option>
                <option value="medium-term">Medium-term</option>
                <option value="short-term">Short-term</option>
              </select>
            </div>
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
                        onValueChange={(value) => setNewTaskNiceValue(value[0])}
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
            {/* Fix the task switching logic in the AlertDialogAction onClick handler:
            // Replace the onClick handler in the Task Switch Confirmation Dialog with: */}

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
                    const nextTask = [...tasksWithoutCurrent].sort((a, b) => a.vruntime - b.vruntime)[0]

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
                        category: taskToComplete.category,
                        completedAt: new Date(),
                        totalTime: taskToComplete.elapsedTime,
                        niceValue: taskToComplete.niceValue,
                      }

                      setCompletedTasks((prev) => [completedTask, ...prev])

                      // Show notification
                      toast({
                        title: "Task Completed",
                        description: `"${taskToComplete.title}" has been completed.`,
                        variant: "default",
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
              {taskToSwitch ? "Yes, Interrupt & Switch Task" : "End task and switch to next"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </main>
  )
}
