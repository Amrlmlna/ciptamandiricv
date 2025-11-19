"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Appointment {
  id: string
  patient_id: string
  appointment_date: string
  duration_minutes: number
  status: string
  notes: string
  cost: number
  treatment_type: string
  frequency?: string
  end_date?: string
  patients?: {
    first_name: string
    last_name: string
    phone: string
    email?: string
  }
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchAppointments()
  }, [])

  const fetchAppointments = async () => {
    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Fetch only appointments for the current month and next month to limit data
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0)

      const { data } = await supabase
        .from("appointments")
        .select("*, patients(first_name, last_name, phone, email)")
        .gte("appointment_date", startDate.toISOString())
        .lte("appointment_date", endDate.toISOString())
        .order("appointment_date", { ascending: true })

      const allAppointments = data || []
      const expandedAppointments = expandOngoingAppointments(allAppointments)
      setAppointments(expandedAppointments)
    } catch (error) {
      console.error("Error fetching appointments:", error)
    } finally {
      setIsLoading(false)
    }
  }


  const expandOngoingAppointments = (appointments: Appointment[]): Appointment[] => {
    const expanded: Appointment[] = []

    appointments.forEach((apt) => {
      expanded.push(apt)

      if (apt.treatment_type === "ongoing" && apt.end_date) {
        // Parse the date strings consistently
        const startDate = new Date(apt.appointment_date)
        const endDate = new Date(apt.end_date)
        let currentDate = new Date(startDate)

        // Use date components to avoid timezone issues in comparison
        const endYear = endDate.getFullYear()
        const endMonth = endDate.getMonth()
        const endDay = endDate.getDate()

        // Add a safety counter to prevent infinite loops
        let loopCounter = 0;
        const maxIterations = 100; // Reduced max iterations for performance - 100 should be plenty for any reasonable use case

        while (loopCounter < maxIterations) {
          // Check if current date has reached or passed the end date
          const currentYear = currentDate.getFullYear()
          const currentMonth = currentDate.getMonth()
          const currentDay = currentDate.getDate()

          if (currentYear > endYear ||
              (currentYear === endYear && currentMonth > endMonth) ||
              (currentYear === endYear && currentMonth === endMonth && currentDay >= endDay)) {
            break
          }

          // Calculate next appointment based on frequency
          const nextDate = new Date(currentDate)

          if (apt.frequency === "daily") {
            nextDate.setDate(nextDate.getDate() + 1)
          } else if (apt.frequency === "weekly") {
            nextDate.setDate(nextDate.getDate() + 7)
          } else if (apt.frequency === "monthly") {
            nextDate.setMonth(nextDate.getMonth() + 1)
          } else if (apt.frequency === "yearly") {
            nextDate.setFullYear(nextDate.getFullYear() + 1)
          }
          // If frequency is undefined or not recognized, skip expansion

          // Check if the next date is before the end date using date components
          const nextYear = nextDate.getFullYear()
          const nextMonth = nextDate.getMonth()
          const nextDay = nextDate.getDate()

          if (nextYear < endYear ||
              (nextYear === endYear && nextMonth < endMonth) ||
              (nextYear === endYear && nextMonth === endMonth && nextDay < endDay)) {
            expanded.push({
              ...apt,
              id: `${apt.id}-${nextDate.getTime()}`,
              // Use toISOString to maintain consistency with DB format
              appointment_date: nextDate.toISOString(),
            })
          }

          currentDate = nextDate
          loopCounter++;
        }
      }
    })

    return expanded
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getAppointmentsForDate = (date: Date) => {
    // Format the input date to match the date part (without time) for comparison
    // Use the local date parts to ensure consistency with user's timezone
    const dateYear = date.getFullYear();
    const dateMonth = date.getMonth();
    const dateDay = date.getDate();
    
    return appointments.filter((apt) => {
      // Create a date object from the appointment date string and extract the same parts
      const aptDate = new Date(apt.appointment_date);
      const aptYear = aptDate.getFullYear();
      const aptMonth = aptDate.getMonth();
      const aptDay = aptDate.getDate();
      
      // Compare only the date parts (year, month, day) to avoid timezone issues
      return aptYear === dateYear && aptMonth === dateMonth && aptDay === dateDay;
    })
  }

  const handlePrevMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
      fetchAppointmentsForDate(newDate)
      return newDate
    })
  }

  const handleNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
      fetchAppointmentsForDate(newDate)
      return newDate
    })
  }

  const fetchAppointmentsForDate = async (date: Date) => {
    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Fetch appointments for the current month and next month to limit data
      const startDate = new Date(date.getFullYear(), date.getMonth(), 1)
      const endDate = new Date(date.getFullYear(), date.getMonth() + 2, 0)

      const { data } = await supabase
        .from("appointments")
        .select("*, patients(first_name, last_name, phone, email)")
        .gte("appointment_date", startDate.toISOString())
        .lte("appointment_date", endDate.toISOString())
        .order("appointment_date", { ascending: true })

      const allAppointments = data || []
      const expandedAppointments = expandOngoingAppointments(allAppointments)
      setAppointments(expandedAppointments)
    } catch (error) {
      console.error("Error fetching appointments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDateClick = (day: number) => {
    // Create the clicked date using local timezone to ensure consistency
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(clickedDate)
    setShowDialog(true)
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const days = []

  for (let i = 0; i < firstDay; i++) {
    days.push(null)
  }

  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day)
  }

  const selectedAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : []

  return (
    <>
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Tampilan Kalender</CardTitle>
          <CardDescription>Klik pada tanggal untuk melihat janji temu untuk hari tersebut</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="outline" onClick={handlePrevMonth} className="border-border bg-transparent">
              Sebelumnya
            </Button>
            <h2 className="text-lg font-semibold text-foreground">
              {currentDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
            </h2>
            <Button variant="outline" onClick={handleNextMonth} className="border-border bg-transparent">
              Berikutnya
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
                <p className="text-muted-foreground">Memuat kalender...</p>
              </div>
            </div>
          ) : (
            /* Calendar Grid */
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
                <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {days.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />
                }

                const dateForDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                const appointmentsForDay = getAppointmentsForDate(dateForDay)
                const isSelected = selectedDate &&
                  selectedDate.getFullYear() === dateForDay.getFullYear() &&
                  selectedDate.getMonth() === dateForDay.getMonth() &&
                  selectedDate.getDate() === dateForDay.getDate()

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`aspect-square p-2 rounded-lg border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : appointmentsForDay.length > 0
                          ? "border-green-500 bg-green-50 dark:bg-green-950"
                          : "border-border hover:bg-muted"
                    }`}
                  >
                    <div className="text-sm font-medium text-foreground">{day}</div>
                    {appointmentsForDay.length > 0 && (
                      <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {appointmentsForDay.length} jadwal
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointments Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Janji Temu - {selectedDate?.toLocaleDateString("id-ID")}</DialogTitle>
          </DialogHeader>

          {selectedAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada janji temu yang dijadwalkan untuk tanggal ini</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedAppointments.map((apt) => (
                <div key={apt.id} className="border border-border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">
                        {apt.patients?.first_name} {apt.patients?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{apt.patients?.phone}</p>
                      {apt.patients?.email && <p className="text-sm text-muted-foreground">{apt.patients.email}</p>}
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        apt.status === "completed"
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : apt.status === "cancelled"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>

                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">Waktu:</span>{" "}
                      {new Date(apt.appointment_date).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Durasi:</span> {apt.duration_minutes} menit
                    </p>
                    {apt.cost && (
                      <p>
                        <span className="text-muted-foreground">Biaya:</span> Rp {apt.cost.toLocaleString("id-ID")}
                      </p>
                    )}
                    {apt.notes && (
                      <p>
                        <span className="text-muted-foreground">Catatan:</span> {apt.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
