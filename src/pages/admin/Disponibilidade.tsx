import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfDay, addMonths, subMonths, parseISO, isSameMonth, addMinutes, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock, Save, Info, ChevronLeft, ChevronRight, User, Ban, CheckCircle2, AlertCircle, Copy, Plus, Trash2, X, ArrowDownToLine } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateTimeSlots, getShiftPresets, TimeSlot } from "@/lib/disponibilidade-utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Constants for "Block" appointments
const BLOCK_CPF = "SYSTEM_BLOCK";
const BLOCK_NAME = "Bloqueio Administrativo";

interface DayStatus {
  date: Date;
  isAvailable: boolean; // Is in datas_disponiveis
  totalSlots: number;
  bookedSlots: number;
  blockedSlots: number;
  isPast: boolean;
  hasCustomSlots: boolean;
}

interface Appointment {
  id: string;
  data: string;
  horario: string;
  cpf_hash: string;
  nome: string;
}

export const AdminDisponibilidade = () => {
  const { toast } = useToast();

  // Create a controlled Date state for the calendar view
  const [viewDate, setViewDate] = useState<Date>(new Date());

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Data State
  const [dayConfigs, setDayConfigs] = useState<Record<string, { active: boolean, custom_slots: string[] | null }>>({});
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [globalConfig, setGlobalConfig] = useState<any>(null);

  // Custom Slot Editing State
  const [newSlotTime, setNewSlotTime] = useState("");
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [editingSlots, setEditingSlots] = useState<string[]>([]);

  // Load data when view month changes
  useEffect(() => {
    fetchMonthData();
  }, [viewDate]);

  // Sync sheet state with selected day
  useEffect(() => {
    if (selectedDate && isSheetOpen) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const config = dayConfigs[dateStr];
      const hasCustom = config?.custom_slots && config.custom_slots.length > 0;
      setIsCustomMode(!!hasCustom);
      setEditingSlots_Safe(config?.custom_slots || []);
    }
  }, [selectedDate, isSheetOpen, dayConfigs]);

  const setEditingSlots_Safe = (slots: string[] | null) => {
    if (!slots) {
      // If switching to custom blocked, maybe pre-fill with generated?
      // For now empty or existing
      setEditingSlots([]);
    } else {
      setEditingSlots([...slots].sort());
    }
  }

  const fetchMonthData = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(viewDate);
      const end = endOfMonth(viewDate);
      const startStr = format(start, "yyyy-MM-dd");
      const endStr = format(end, "yyyy-MM-dd");

      // 1. Get Global Config
      const { data: configData } = await supabase
        .from("configuracoes_disponibilidade")
        .select("*")
        .maybeSingle();

      setGlobalConfig(configData);

      // 2. Get Available Dates (active days)
      const { data: datesData } = await supabase
        .from("datas_disponiveis")
        .select("data, ativo, custom_slots")
        .gte("data", startStr)
        .lte("data", endStr);

      const configMap: Record<string, any> = {};
      datesData?.forEach((d: any) => {
        // Store all dates that have entries, but mark active status
        // If ativo is false, we still might want to know about it if we toggle it back, 
        // but strictly speaking 'isAvailable' depends on active=true.
        if (d.ativo) {
          configMap[d.data] = { active: true, custom_slots: d.custom_slots };
        }
      });
      setDayConfigs(configMap);

      // 3. Get Appointments (including blocks)
      const { data: apptData, error } = await supabase
        .from("agendamentos")
        .select("id, data, horario, cpf_hash, nome")
        .gte("data", startStr)
        .lte("data", endStr)
        .neq("status", "cancelado");

      if (error) throw error;

      setAppointments(apptData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Erro", description: "Falha ao carregar dados.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- Computed Helpers ---

  const getDayStatus = (day: Date): DayStatus => {
    const dateStr = format(day, "yyyy-MM-dd");
    const dayConfig = dayConfigs[dateStr];
    const isAvailable = !!dayConfig?.active;
    const dayAppts = appointments.filter(a => a.data === dateStr);

    // Calculate slots
    let total = 0;
    const hasCustomSlots = !!(dayConfig?.custom_slots && dayConfig.custom_slots.length > 0);

    if (hasCustomSlots) {
      total = dayConfig!.custom_slots!.length;
    } else {
      // Manual Mode default: 0 slots if none defined
      total = 0;
    }

    const blocked = dayAppts.filter(a => a.cpf_hash === BLOCK_CPF).length;
    const booked = dayAppts.length - blocked;

    return {
      date: day,
      isAvailable,
      totalSlots: total,
      bookedSlots: booked,
      blockedSlots: blocked,
      isPast: isBefore(day, startOfDay(new Date())),
      hasCustomSlots
    };
  };

  const getSlotsForSelectedDate = (): { slot: TimeSlot, appt?: Appointment, isBlocked: boolean }[] => {
    if (!selectedDate || !globalConfig) return [];

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const dayConfig = dayConfigs[dateStr];

    let rawSlots: TimeSlot[] = [];

    // If Custom Mode is active in UI (preview) or saved in DB
    // We prioritize what's in DB unless we are editing?
    // Let's use DB truth for display, unless user is editing in the sheet?
    // Actually, for the "Grid" display in the sheet, we should verify invalidation.

    if (dayConfig?.custom_slots && dayConfig.custom_slots.length > 0) {
      // Use custom slots
      rawSlots = dayConfig.custom_slots.map(time => {
        // Simplified duration calc
        // Parse time HH:mm
        const [h, m] = time.split(':').map(Number);
        const dummyDate = new Date();
        dummyDate.setHours(h, m, 0, 0);
        const endTime = addMinutes(dummyDate, globalConfig.duracao_sessao);

        return {
          start: time.slice(0, 5), // Ensure HH:mm
          end: format(endTime, "HH:mm"),
          available: true
        };
      }).sort((a, b) => a.start.localeCompare(b.start));
    } else {
      // Strict Manual Mode: No Global Generation.
      rawSlots = [];
    }

    const dayAppts = appointments.filter(a => a.data === dateStr);

    return rawSlots.map(slot => {
      const appt = dayAppts.find(a => a.horario.startsWith(slot.start));
      const isBlocked = appt?.cpf_hash === BLOCK_CPF;
      return { slot, appt, isBlocked };
    });
  };

  // --- Actions ---

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsSheetOpen(true);
  };

  const toggleDayAvailability = async (enable: boolean) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // Optimistic UI
    setDayConfigs(prev => {
      const current = prev[dateStr];
      if (enable) {
        return { ...prev, [dateStr]: { active: true, custom_slots: current?.custom_slots || null } };
      } else {
        // Remove from active map
        const { [dateStr]: _, ...rest } = prev;
        return rest;
      }
    });

    try {
      if (enable) {
        // Activate (keep custom_slots if any)
        // If it doesn't exist, it creates. If it exists (e.g. inactive hidden row), it updates.
        // We need to know previous state logic.
        // For now, simplify: upsert active=true. 
        // If we want to preserve custom_slots of a previously deleted day, we can't unless we didn't delete it.
        // Assuming we start "fresh" or keep existing record.
        await supabase.from("datas_disponiveis").upsert({ data: dateStr, ativo: true }, { onConflict: "data" });
      } else {
        // Disable
        const hasRealAppts = appointments.some(a => a.data === dateStr && a.cpf_hash !== BLOCK_CPF);
        if (hasRealAppts) {
          toast({
            title: "Bloqueio Impedido",
            description: "Existem agendamentos para este dia. Cancele-os primeiro.",
            variant: "destructive"
          });
          // Revert optimistic
          fetchMonthData();
          return;
        }
        // Soft delete (active = false) to preserve custom_slots?
        // User requested "custom slots logic". 
        // Let's set ativo=false
        await supabase.from("datas_disponiveis").upsert({ data: dateStr, ativo: false }, { onConflict: "data" });
      }
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao atualizar dia." });
      fetchMonthData(); // Revert
    }
  };

  const saveCustomSlots = async (slots: string[]) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    setSaving(true);
    try {
      // Verify if we are removing slots that have real bookings
      const dayAppts = appointments.filter(a => a.data === dateStr && a.cpf_hash !== BLOCK_CPF);
      const slotsSet = new Set(slots);

      const strandedAppts = dayAppts.filter(a => !slotsSet.has(a.horario.slice(0, 5)));

      if (strandedAppts.length > 0) {
        toast({
          title: "Conflito de Agendamento",
          description: `Não é possível remover horários que possuem agendamentos (${strandedAppts.length}).`,
          variant: "destructive"
        });
        setSaving(false);
        return;
      }

      // Save
      const { error } = await supabase.from("datas_disponiveis").upsert({
        data: dateStr,
        ativo: true,
        custom_slots: slots.length > 0 ? slots : null
      }, { onConflict: "data" });

      if (error) throw error;

      setDayConfigs(prev => ({
        ...prev,
        [dateStr]: { active: true, custom_slots: slots.length > 0 ? slots : null }
      }));

      toast({ title: "Salvo", description: "Horários personalizados salvos." });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Erro ao salvar",
        description: e.message || "Falha ao salvar horários.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  }

  const toggleSlot = async (time: string, isBlocked: boolean, currentApptId?: string) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      if (isBlocked) {
        // UNBLOCK (Delete the block appointment)
        if (currentApptId) {
          const { error } = await supabase.from("agendamentos").delete().eq("id", currentApptId);
          if (error) throw error;

          setAppointments(prev => prev.filter(a => a.id !== currentApptId));
        }
      } else {
        // BLOCK (Create a block appointment)
        const newAppt = {
          data: dateStr,
          horario: time + ":00",
          nome: BLOCK_NAME,
          cpf_hash: BLOCK_CPF,
          status: 'confirmado'
        };

        const { data, error } = await supabase.from("agendamentos").insert(newAppt).select().single();
        if (error) throw error;

        if (data) {
          setAppointments(prev => [...prev, data]);
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Falha ao alterar horário." });
    }
  };

  const applyPreset = async (type: string) => {
    if (!selectedDate || !globalConfig) return;
    setSaving(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    try {
      // Logic for presets needs to respect Custom Slots?
      // Usually Presets are for "Morning", "Afternoon" -> blocking parts of the day.
      // If Custom Slots is active, we should probably switch back to Auto if user clicks a preset?
      // OR, we apply blocks on TOP of custom slots?
      // Assuming Presets imply "Standard Shift", so switch to Auto.

      // Update DB to clear custom_slots logic if we apply a preset?
      // Or just apply blocks. 
      // Let's assume Preset = Auto Mode + Blocks.

      const startGlobal = globalConfig.hora_inicio;
      const endGlobal = globalConfig.hora_fim;

      let targetStart = startGlobal;
      let targetEnd = endGlobal;

      if (type === 'morning') {
        targetEnd = "12:00:00";
      } else if (type === 'afternoon') {
        targetStart = "13:00:00";
      }

      // Force Auto Mode (clear custom slots)
      await supabase.from("datas_disponiveis").upsert({
        data: dateStr,
        ativo: true,
        custom_slots: null
      }, { onConflict: "data" });

      const slots = generateTimeSlots(
        startGlobal.slice(0, 5),
        endGlobal.slice(0, 5),
        globalConfig.duracao_sessao,
        globalConfig.intervalo,
        globalConfig.pausa_almoco_ativa ? globalConfig.pausa_almoco_inicio?.slice(0, 5) : undefined,
        globalConfig.pausa_almoco_ativa ? globalConfig.pausa_almoco_fim?.slice(0, 5) : undefined
      );

      const slotsToBlock: string[] = [];
      const slotsToUnblock: string[] = [];

      slots.forEach(slot => {
        const slotTime = slot.start + ":00";
        const isTarget = (slotTime >= targetStart && slotTime < targetEnd);

        if (isTarget) {
          slotsToUnblock.push(slot.start);
        } else {
          slotsToBlock.push(slot.start);
        }
      });

      const dayAppts = appointments.filter(a => a.data === dateStr);

      // A. Unblocking
      const blocksToRemove = dayAppts.filter(a => a.cpf_hash === BLOCK_CPF && slotsToUnblock.some(t => a.horario.startsWith(t)));
      if (blocksToRemove.length > 0) {
        await supabase.from("agendamentos").delete().in("id", blocksToRemove.map(a => a.id));
      }

      // B. Blocking
      const newBlocks: any[] = [];
      let conflictCount = 0;

      for (const time of slotsToBlock) {
        const existing = dayAppts.find(a => a.horario.startsWith(time));
        if (!existing) {
          newBlocks.push({
            data: dateStr,
            horario: time + ":00",
            nome: BLOCK_NAME,
            cpf_hash: BLOCK_CPF,
            status: 'confirmado'
          });
        } else if (existing.cpf_hash !== BLOCK_CPF) {
          conflictCount++;
        }
      }

      if (newBlocks.length > 0) {
        await supabase.from("agendamentos").insert(newBlocks);
      }

      await fetchMonthData(); // Refetch to sync clean slate
      toast({ title: "Sucesso", description: "Turno aplicado (Modo Automático)." });

    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Falha ao aplicar preset." });
    } finally {
      setSaving(false);
    }
  };

  const replicateDay = async (targetMode: 'month_weekday' | 'month_all') => {
    if (!selectedDate || !globalConfig) return;
    const confirmMsg = targetMode === 'month_weekday'
      ? `Isso copiará a configuração de HOJE para todas as ${format(selectedDate, "EEEE", { locale: ptBR })}s deste mês.`
      : "Isso copiará a configuração de HOJE para TODOS os dias letivos deste mês.";

    if (!confirm(confirmMsg)) return;

    setSaving(true);
    try {
      const sourceDateStr = format(selectedDate, "yyyy-MM-dd");
      const sourceConfig = dayConfigs[sourceDateStr];
      const isSourceAvailable = sourceConfig?.active;
      const sourceBlocks = appointments.filter(a => a.data === sourceDateStr && a.cpf_hash === BLOCK_CPF).map(a => a.horario);

      const start = startOfMonth(viewDate);
      const end = endOfMonth(viewDate);
      const allDays = eachDayOfInterval({ start, end });

      const targetDates = allDays.filter(d => {
        if (isSameDay(d, selectedDate)) return false;
        if (targetMode === 'month_weekday') {
          return d.getDay() === selectedDate.getDay();
        }
        const day = d.getDay();
        return day >= 1 && day <= 5;
      });

      const targetDateStrs = targetDates.map(d => format(d, "yyyy-MM-dd"));

      if (isSourceAvailable) {
        // Upsert with same configs (custom slots included!)
        const customSlots = sourceConfig.custom_slots;
        const upserts = targetDateStrs.map(d => ({
          data: d,
          ativo: true,
          custom_slots: customSlots // REPLICATE CUSTOM SLOTS
        }));
        await supabase.from("datas_disponiveis").upsert(upserts, { onConflict: 'data' });
      } else {
        // Check conflicts before disabling
        const { data: conflicts } = await supabase
          .from("agendamentos")
          .select("data")
          .in("data", targetDateStrs)
          .neq("status", "cancelado")
          .neq("cpf_hash", BLOCK_CPF);

        if (conflicts && conflicts.length > 0) {
          toast({
            title: "Ação Bloqueada",
            description: `Existem agendamentos em ${conflicts.length} dias alvo. Não é possível fechar os dias em massa.`,
            variant: "destructive"
          });
          setSaving(false);
          return;
        }
        // Soft disable
        const upserts = targetDateStrs.map(d => ({ data: d, ativo: false }));
        await supabase.from("datas_disponiveis").upsert(upserts, { onConflict: 'data' });
      }

      if (isSourceAvailable) {
        // Replicate Blocks
        // First clean blocks on targets
        await supabase.from("agendamentos")
          .delete()
          .eq("cpf_hash", BLOCK_CPF)
          .in("data", targetDateStrs);

        const { data: realAppts } = await supabase
          .from("agendamentos")
          .select("data, horario")
          .in("data", targetDateStrs)
          .neq("cpf_hash", BLOCK_CPF)
          .neq("status", "cancelado");

        const newBlocksToInsert: any[] = [];

        targetDateStrs.forEach(targetDate => {
          sourceBlocks.forEach(blockTime => {
            const conflict = realAppts?.some(ra => ra.data === targetDate && ra.horario.startsWith(blockTime.slice(0, 5)));
            if (!conflict) {
              newBlocksToInsert.push({
                data: targetDate,
                horario: blockTime,
                nome: BLOCK_NAME,
                cpf_hash: BLOCK_CPF,
                status: 'confirmado'
              });
            }
          });
        });

        if (newBlocksToInsert.length > 0) {
          await supabase.from("agendamentos").insert(newBlocksToInsert);
        }
      }

      toast({ title: "Sucesso", description: `Configuração replicada para ${targetDates.length} dias.` });
      await fetchMonthData();

    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Falha na replicação em massa." });
    } finally {
      setSaving(false);
    }
  };

  const handleAddSlot = () => {
    if (!newSlotTime) return;
    if (editingSlots.includes(newSlotTime)) {
      toast({ title: "Existente", description: "Horário já existe." });
      return;
    }
    // Validation matches regex HH:mm
    if (!/^\d{2}:\d{2}$/.test(newSlotTime)) {
      toast({ title: "Formato inválido", description: "Use HH:mm" });
      return;
    }
    const newList = [...editingSlots, newSlotTime].sort();
    setEditingSlots(newList);
    setNewSlotTime("");
  };

  const handleRemoveSlot = (time: string) => {
    setEditingSlots(prev => prev.filter(t => t !== time));
  };

  // --- Renderers ---

  const renderCalendarDay = (props: any) => {
    const { date, displayMonth } = props;
    if (!isSameMonth(date, displayMonth)) return <div className="opacity-0">{date.getDate()}</div>;

    const status = getDayStatus(date);
    const isSelected = selectedDate && isSameDay(date, selectedDate);

    let bgClass = "hover:bg-accent/50";
    let textClass = "";

    if (status.isAvailable) {
      bgClass = "bg-primary/5 hover:bg-primary/10 border-primary/20";
      if (status.bookedSlots > 0 && status.bookedSlots < status.totalSlots) {
        // Partial
      } else if (status.bookedSlots >= status.totalSlots && status.totalSlots > 0) {
        bgClass = "bg-destructive/5 border-destructive/20";
        textClass = "text-destructive";
      }

      if (status.hasCustomSlots) {
        bgClass += " border-dashed border-blue-400/50"; // Visual indicator for custom
      }
    } else {
      bgClass = "opacity-50 grayscale";
    }

    if (isSelected) {
      bgClass = "ring-2 ring-primary bg-primary/10";
    }

    return (
      <div
        onClick={() => handleDayClick(date)}
        className={cn(
          "h-full min-h-[auto] w-full p-1 sm:p-2 border rounded-md transition-all cursor-pointer flex flex-col justify-between relative text-sm",
          bgClass,
          textClass
        )}
      >
        <div className="font-medium text-right">{date.getDate()}</div>

        {status.isAvailable && (
          <div className="space-y-1">
            {status.bookedSlots > 0 && (
              <div className="flex items-center gap-1 text-xs text-primary font-medium">
                <User className="h-3 w-3" /> {status.bookedSlots}
              </div>
            )}
            {status.blockedSlots > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Ban className="h-3 w-3" /> {status.blockedSlots}
              </div>
            )}
            {/* Simple saturation dot */}
            <div className={cn("absolute top-2 left-2 h-2 w-2 rounded-full",
              status.bookedSlots >= status.totalSlots ? "bg-destructive" : (status.hasCustomSlots ? "bg-blue-500" : "bg-emerald-500")
            )} />
          </div>
        )}
      </div>
    );
  };

  const selectedDayInfo = selectedDate ? getDayStatus(selectedDate) : null;
  const currentSlots = getSlotsForSelectedDate();

  return (
    <AdminLayout title="Configuração de Datas">
      <div className="flex flex-col gap-4 h-[calc(100vh-80px)]">

        <div className="flex items-center justify-between bg-card p-3 rounded-lg border shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => setViewDate(prev => subMonths(prev, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-semibold capitalize">
              {format(viewDate, "MMMM yyyy", { locale: ptBR })}
            </h2>
            <Button variant="outline" size="icon" onClick={() => setViewDate(prev => addMonths(prev, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mr-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" /> Vagas Abertas
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive" /> Cheio
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-gray-300" /> Fechado
            </div>
          </div>
        </div>

        <Card className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="grid grid-cols-7 gap-1 p-2 border-b bg-muted/30 text-center font-medium text-muted-foreground text-sm shrink-0">
            <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sáb</div>
          </div>
          <div className="flex-1 p-2 grid grid-cols-7 grid-rows-6 gap-2 min-h-0">
            {/* Empty slots for start of month alignment */}
            {Array.from({ length: startOfMonth(viewDate).getDay() }).map((_, i) => (
              <div key={`empty-start-${i}`} className="bg-muted/5 rounded-md border-transparent" />
            ))}

            {/* Days */}
            {eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) }).map((date) => (
              <div key={date.toISOString()} className="contents">
                {renderCalendarDay({ date, displayMonth: viewDate })}
              </div>
            ))}
          </div>
        </Card>

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
            {selectedDate && selectedDayInfo && (
              <>
                <SheetHeader>
                  <SheetTitle className="capitalize text-2xl flex items-center gap-2">
                    {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    {!selectedDayInfo.isAvailable && <Badge variant="outline">Fechado</Badge>}
                  </SheetTitle>
                  <SheetDescription>
                    Gerencie os horários para este dia.
                  </SheetDescription>
                </SheetHeader>

                <div className="py-6 space-y-6">
                  {/* Master Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                    <div className="space-y-0.5">
                      <Label className="text-base">Agendamento</Label>
                      <p className="text-sm text-muted-foreground">Habilitar agendamentos?</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-sm font-medium", selectedDayInfo.isAvailable ? "text-primary" : "text-muted-foreground")}>
                        {selectedDayInfo.isAvailable ? "Sim, Aberto" : "Fechado"}
                      </span>
                      <Switch
                        checked={selectedDayInfo.isAvailable}
                        onCheckedChange={(checked) => toggleDayAvailability(checked)}
                      />
                    </div>
                  </div>

                  {selectedDayInfo.isAvailable && (
                    <>
                      {/* Manual Slots UI */}
                      <div className="p-4 border rounded-lg space-y-4 border-blue-200 bg-blue-50/50">
                        <div className="flex justify-between items-center">
                          <Label>Lista de Horários</Label>
                          <span className="text-xs text-muted-foreground">Digite apenas números (ex: 1400 e Enter)</span>
                        </div>

                        <div className="flex gap-2">
                          {/* Smart Input */}
                          <Input
                            placeholder="HHmm"
                            value={newSlotTime}
                            onChange={e => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 4) val = val.slice(0, 4);

                              // Visual formatting
                              if (val.length > 2) {
                                setNewSlotTime(val.slice(0, 2) + ':' + val.slice(2));
                              } else {
                                setNewSlotTime(val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddSlot();
                            }}
                            className="w-24 font-mono text-center"
                            maxLength={5}
                          />
                          <Button size="sm" onClick={handleAddSlot}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
                        </div>

                        <ScrollArea className="h-40 border rounded-md p-2 bg-background">
                          <div className="flex flex-wrap gap-2">
                            {editingSlots.map(time => (
                              <Badge key={time} variant="outline" className="pl-2 pr-1 py-1 flex items-center gap-1 text-sm bg-background border-input shadow-sm">
                                {time}
                                <Button variant="ghost" size="icon" className="h-4 w-4 ml-1 hover:text-red-500 rounded-full h-auto p-0" onClick={() => handleRemoveSlot(time)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </Badge>
                            ))}
                            {editingSlots.length === 0 && (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm italic">
                                Nenhum horário definido. O dia aparecerá sem vagas.
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                        <Button className="w-full" onClick={() => saveCustomSlots(editingSlots)} disabled={saving}>
                          {saving ? <span className="animate-spin mr-2">⏳</span> : <Save className="h-4 w-4 mr-2" />}
                          Salvar Alterações
                        </Button>
                      </div>

                      <Separator />

                      {/* Slots Grid Visualization (Read Only / Block Management) */}
                      <div className="space-y-4 opacity-80">
                        <div className="flex items-center justify-between">
                          <Label className="text-muted-foreground">Status das Vagas (Visualização)</Label>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {currentSlots.map(({ slot, appt, isBlocked }) => {
                            const isBooked = !!appt && !isBlocked;
                            let variant: "default" | "secondary" | "destructive" | "outline" = "outline";

                            if (isBooked) variant = "destructive";
                            else if (isBlocked) variant = "secondary";
                            else variant = "default"; // Available

                            return (
                              <TooltipProvider key={slot.start}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant={variant}
                                      className={cn("h-8 text-xs", isBooked ? "cursor-not-allowed" : "")}
                                      disabled={isBooked}
                                      onClick={() => !isBooked && toggleSlot(slot.start, isBlocked, appt?.id)}
                                    >
                                      {slot.start}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {isBooked ? `Ocupado: ${appt?.nome}` : isBlocked ? "Bloqueado" : "Disponível"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                          {currentSlots.length === 0 && <div className="col-span-4 text-center text-xs text-muted-foreground">Sem vagas ativas.</div>}
                        </div>
                      </div>

                      <Separator />

                      {/* Bulk Actions */}
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          <Copy className="h-4 w-4" /> Ações em Massa
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" className="h-auto py-3 text-left flex flex-col items-start" onClick={() => replicateDay('month_weekday')}>
                            <span className="font-medium">Replicar em todas as {format(selectedDate, "EEEE", { locale: ptBR })}s</span>
                            <span className="text-xs text-muted-foreground font-normal">Copia horários para o mês todo</span>
                          </Button>
                          <Button variant="outline" className="h-auto py-3 text-left flex flex-col items-start" onClick={() => replicateDay('month_all')}>
                            <span className="font-medium">Replicar no Mês Todo</span>
                            <span className="text-xs text-muted-foreground font-normal">Define todos os dias úteis iguais</span>
                          </Button>
                        </div>

                        {/* NEW: Copy From Date */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full h-auto py-3 flex flex-col items-center gap-1 border-dashed border-2">
                              <span className="font-semibold flex items-center gap-2"><ArrowDownToLine className="h-4 w-4" /> Copiar de Outro Dia</span>
                              <span className="text-xs text-muted-foreground font-normal">Importa a configuração de uma data específica para hoje</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="center">
                            <Calendar
                              mode="single"
                              selected={undefined}
                              onSelect={async (date) => {
                                if (!date) return;
                                const dateStr = format(date, 'yyyy-MM-dd');

                                // Check if we have it in local state first
                                let slotsToCopy = dayConfigs[dateStr]?.custom_slots;

                                // If not, try fetching from DB (rare case if not loaded, but good safety)
                                if (!slotsToCopy) {
                                  // @ts-ignore
                                  const { data } = await supabase.from('datas_disponiveis').select('custom_slots').eq('data', dateStr).maybeSingle();
                                  if (data) slotsToCopy = data.custom_slots;
                                }

                                if (slotsToCopy && slotsToCopy.length > 0) {
                                  setEditingSlots(slotsToCopy);
                                  toast({ title: "Copiado!", description: `Horários de ${format(date, 'dd/MM')} importados para hoje.` });
                                } else {
                                  toast({ title: "Aviso", description: "A data selecionada não possui horários definidos.", variant: "destructive" });
                                }
                              }}
                              initialFocus
                              disabled={(date) => isSameDay(date, selectedDate)}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
};
