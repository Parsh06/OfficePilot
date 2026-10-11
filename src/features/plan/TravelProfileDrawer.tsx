import React, { useState } from 'react';
import { Drawer } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTripStore } from '@/stores/tripStore';
import type { TravelProfile, RouteSegment, TravelSegmentMode, RouteDirection } from '@/lib/travelEngine';
import { calculateOutboundCost, calculateReturnCost } from '@/lib/travelEngine';
import { formatCurrency } from '@/lib/utils';
import { 
  Compass, 
  Plus, 
  Trash2, 
  ArrowRight, 
  Train, 
  Plane, 
  Car, 
  Footprints, 
  Bus, 
  Save,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface TravelProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AVAILABLE_MODES: { value: TravelSegmentMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'walking', label: 'Walking', icon: Footprints },
  { value: 'bus', label: 'Bus', icon: Bus },
  { value: 'train', label: 'Train / Rail', icon: Train },
  { value: 'metro', label: 'Metro', icon: Train },
  { value: 'auto', label: 'Auto Rickshaw', icon: Car },
  { value: 'rapido', label: 'Rapido Bike', icon: Car },
  { value: 'uber', label: 'Uber / Rideshare', icon: Car },
  { value: 'cab', label: 'Private Cab', icon: Car },
  { value: 'flight', label: 'Flight', icon: Plane },
  { value: 'fuel', label: 'Personal Fuel', icon: Car },
  { value: 'other', label: 'Other', icon: Compass },
];

export const TravelProfileDrawer: React.FC<TravelProfileDrawerProps> = ({
  open,
  onOpenChange,
}) => {
  const travelProfiles = useTripStore((s) => s.travelProfiles);
  const activeProfile = useTripStore((s) => s.activeProfile);
  const setActiveProfile = useTripStore((s) => s.setActiveProfile);
  const saveTravelProfile = useTripStore((s) => s.saveTravelProfile);

  const [selectedProfileId, setSelectedProfileId] = useState<string>(activeProfile?.id || travelProfiles[0]?.id || '');
  const [profileName, setProfileName] = useState(activeProfile?.name || 'Standard Commute');
  const [homeLocation, setHomeLocation] = useState(activeProfile?.homeLocation || 'Mumbai');
  const [officeLocation, setOfficeLocation] = useState(activeProfile?.officeLocation || 'Pune');
  const [outboundSegs, setOutboundSegs] = useState<RouteSegment[]>(activeProfile?.outboundSegments || []);
  const [returnSegs, setReturnSegs] = useState<RouteSegment[]>(activeProfile?.returnSegments || []);

  const [isSaving, setIsSaving] = useState(false);

  // Sync state when activeProfile or open changes
  React.useEffect(() => {
    if (activeProfile) {
      setSelectedProfileId(activeProfile.id);
      setProfileName(activeProfile.name);
      setHomeLocation(activeProfile.homeLocation);
      setOfficeLocation(activeProfile.officeLocation);
      setOutboundSegs(activeProfile.outboundSegments || []);
      setReturnSegs(activeProfile.returnSegments || []);
    }
  }, [activeProfile, open]);

  const handleSelectProfile = (p: TravelProfile) => {
    setActiveProfile(p);
    setSelectedProfileId(p.id);
    setProfileName(p.name);
    setHomeLocation(p.homeLocation);
    setOfficeLocation(p.officeLocation);
    setOutboundSegs(p.outboundSegments || []);
    setReturnSegs(p.returnSegments || []);
  };

  const handleAddSegment = (direction: RouteDirection) => {
    const isOut = direction === 'OUTBOUND';
    const currentList = isOut ? outboundSegs : returnSegs;
    const newSeq = currentList.length + 1;

    const newSegment: RouteSegment = {
      id: `seg_${Date.now()}_${newSeq}`,
      label: isOut ? `Segment ${newSeq}` : `Return Segment ${newSeq}`,
      mode: isOut ? 'train' : 'train',
      origin: isOut ? homeLocation : officeLocation,
      destination: isOut ? officeLocation : homeLocation,
      estimatedCost: 300,
      estimatedDurationMinutes: 45,
      sequence: newSeq,
      direction,
      active: true,
    };

    if (isOut) {
      setOutboundSegs([...outboundSegs, newSegment]);
    } else {
      setReturnSegs([...returnSegs, newSegment]);
    }
  };

  const handleRemoveSegment = (direction: RouteDirection, id: string) => {
    if (direction === 'OUTBOUND') {
      setOutboundSegs(outboundSegs.filter((s) => s.id !== id));
    } else {
      setReturnSegs(returnSegs.filter((s) => s.id !== id));
    }
  };

  const handleUpdateSegment = (
    direction: RouteDirection,
    id: string,
    updates: Partial<RouteSegment>
  ) => {
    if (direction === 'OUTBOUND') {
      setOutboundSegs(outboundSegs.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    } else {
      setReturnSegs(returnSegs.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await saveTravelProfile({
        id: selectedProfileId,
        name: profileName,
        homeLocation,
        officeLocation,
        outboundSegments: outboundSegs,
        returnSegments: returnSegs,
        isDefault: true,
      });
      setActiveProfile(updated);
      toast.success('Travel profile & multi-modal route segments saved!');
      onOpenChange(false);
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const totalOutboundCost = calculateOutboundCost(outboundSegs);
  const totalReturnCost = calculateReturnCost(returnSegs);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-indigo-400" />
          <span>Travel Route & Multi-Modal Profiles</span>
        </div>
      }
      description="Configure multi-segment door-to-door transit corridors for office commutes"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="gap-1.5"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Profile & Segments'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Profile Selector Chips */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Select Active Travel Profile
          </label>
          <div className="flex flex-wrap gap-2">
            {travelProfiles.map((p) => {
              const isActive = p.id === selectedProfileId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectProfile(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isActive && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Profile Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#0e111a] border border-slate-800">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Profile Name</label>
            <Input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. Pune Office Commute"
              className="text-xs h-9 bg-slate-900 border-slate-700"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Home City / Origin</label>
            <Input
              value={homeLocation}
              onChange={(e) => setHomeLocation(e.target.value)}
              placeholder="e.g. Mumbai"
              className="text-xs h-9 bg-slate-900 border-slate-700"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Office City / Hub</label>
            <Input
              value={officeLocation}
              onChange={(e) => setOfficeLocation(e.target.value)}
              placeholder="e.g. Pune"
              className="text-xs h-9 bg-slate-900 border-slate-700"
            />
          </div>
        </div>

        {/* Cost Summary Header */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 text-xs">
          <div>
            <span className="text-slate-400">Outbound Corridor Total:</span>
            <p className="text-base font-bold text-emerald-400 mt-0.5">{formatCurrency(totalOutboundCost)}</p>
          </div>
          <div>
            <span className="text-slate-400">Return Corridor Total:</span>
            <p className="text-base font-bold text-cyan-400 mt-0.5">{formatCurrency(totalReturnCost)}</p>
          </div>
        </div>

        {/* Outbound Route Segments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ArrowRight className="w-4 h-4 text-emerald-400" />
              Outbound Segments ({homeLocation} ➔ {officeLocation})
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddSegment('OUTBOUND')}
              className="text-xs h-7 gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Segment
            </Button>
          </div>

          <div className="space-y-2.5">
            {outboundSegs.map((seg, idx) => (
              <div
                key={seg.id}
                className="p-3 rounded-xl bg-[#111420] border border-slate-800 text-xs space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-200">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                      {idx + 1}
                    </span>
                    <Input
                      value={seg.label}
                      onChange={(e) =>
                        handleUpdateSegment('OUTBOUND', seg.id, { label: e.target.value })
                      }
                      className="h-7 text-xs bg-slate-900 border-slate-700 w-44"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={seg.mode}
                      onChange={(e) =>
                        handleUpdateSegment('OUTBOUND', seg.id, {
                          mode: e.target.value as TravelSegmentMode,
                        })
                      }
                      className="h-7 rounded-md bg-slate-900 border border-slate-700 text-xs text-slate-200 px-2"
                    >
                      {AVAILABLE_MODES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveSegment('OUTBOUND', seg.id)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 w-7"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">From</label>
                    <Input
                      value={seg.origin}
                      onChange={(e) =>
                        handleUpdateSegment('OUTBOUND', seg.id, { origin: e.target.value })
                      }
                      className="h-7 text-xs bg-slate-900 border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">To</label>
                    <Input
                      value={seg.destination}
                      onChange={(e) =>
                        handleUpdateSegment('OUTBOUND', seg.id, { destination: e.target.value })
                      }
                      className="h-7 text-xs bg-slate-900 border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Cost (₹)</label>
                    <Input
                      type="number"
                      value={seg.estimatedCost}
                      onChange={(e) =>
                        handleUpdateSegment('OUTBOUND', seg.id, {
                          estimatedCost: Number(e.target.value),
                        })
                      }
                      className="h-7 text-xs bg-slate-900 border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Duration (min)</label>
                    <Input
                      type="number"
                      value={seg.estimatedDurationMinutes || ''}
                      onChange={(e) =>
                        handleUpdateSegment('OUTBOUND', seg.id, {
                          estimatedDurationMinutes: Number(e.target.value),
                        })
                      }
                      placeholder="e.g. 45"
                      className="h-7 text-xs bg-slate-900 border-slate-700"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Return Route Segments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <ArrowRight className="w-4 h-4 text-cyan-400" />
              Return Segments ({officeLocation} ➔ {homeLocation})
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddSegment('RETURN')}
              className="text-xs h-7 gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Segment
            </Button>
          </div>

          <div className="space-y-2.5">
            {returnSegs.map((seg, idx) => (
              <div
                key={seg.id}
                className="p-3 rounded-xl bg-[#111420] border border-slate-800 text-xs space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-200">
                    <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-400">
                      {idx + 1}
                    </span>
                    <Input
                      value={seg.label}
                      onChange={(e) =>
                        handleUpdateSegment('RETURN', seg.id, { label: e.target.value })
                      }
                      className="h-7 text-xs bg-slate-900 border-slate-700 w-44"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={seg.mode}
                      onChange={(e) =>
                        handleUpdateSegment('RETURN', seg.id, {
                          mode: e.target.value as TravelSegmentMode,
                        })
                      }
                      className="h-7 rounded-md bg-slate-900 border border-slate-700 text-xs text-slate-200 px-2"
                    >
                      {AVAILABLE_MODES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemoveSegment('RETURN', seg.id)}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 w-7"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">From</label>
                    <Input
                      value={seg.origin}
                      onChange={(e) =>
                        handleUpdateSegment('RETURN', seg.id, { origin: e.target.value })
                      }
                      className="h-7 text-xs bg-slate-900 border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">To</label>
                    <Input
                      value={seg.destination}
                      onChange={(e) =>
                        handleUpdateSegment('RETURN', seg.id, { destination: e.target.value })
                      }
                      className="h-7 text-xs bg-slate-900 border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Cost (₹)</label>
                    <Input
                      type="number"
                      value={seg.estimatedCost}
                      onChange={(e) =>
                        handleUpdateSegment('RETURN', seg.id, {
                          estimatedCost: Number(e.target.value),
                        })
                      }
                      className="h-7 text-xs bg-slate-900 border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Duration (min)</label>
                    <Input
                      type="number"
                      value={seg.estimatedDurationMinutes || ''}
                      onChange={(e) =>
                        handleUpdateSegment('RETURN', seg.id, {
                          estimatedDurationMinutes: Number(e.target.value),
                        })
                      }
                      placeholder="e.g. 45"
                      className="h-7 text-xs bg-slate-900 border-slate-700"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
