'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Camera, SwitchCamera, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export default function QRScanner() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasCamera, setHasCamera] = useState<boolean | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanResult, setScanResult] = useState<{ status: 'success' | 'error', message: string, points?: number } | null>(null)
  
  const [events, setEvents] = useState<{id: string, name: string, event_date: string}[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [useFrontCamera, setUseFrontCamera] = useState(false)

  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE])
  hints.set(DecodeHintType.TRY_HARDER, true)

  const codeReader = useRef(new BrowserQRCodeReader(hints))
  const controlsRef = useRef<IScannerControls | null>(null)

  const supabase = createClient()

  useEffect(() => {
    // Check for camera access
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(() => setHasCamera(true))
      .catch(() => setHasCamera(false))

    // Fetch events
    const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('id, name, event_date').order('event_date', { ascending: false })
      if (data) setEvents(data)
    }
    fetchEvents()

    return () => {
      controlsRef.current?.stop()
    }
  }, [supabase])

  const startScanning = async () => {
    if (!selectedEventId) {
      toast.error('Please select an event first.')
      return
    }

    setIsScanning(true)
    setScanResult(null)

    try {
      if (!videoRef.current) throw new Error('Video element not ready')

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: useFrontCamera ? 'user' : { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }

      const controls = await codeReader.current.decodeFromConstraints(
        constraints,
        videoRef.current,
        (result, err) => {
          if (result) {
            handleScanResult(result.getText())
          }
          if (err && err.name !== 'NotFoundException') {
            // Suppress common per-frame "no QR found" errors; log real ones
            if (!err.message?.includes('No MultiFormat Readers')) {
              // console.debug('scan tick:', err.message)
            }
          }
        }
      )
      controlsRef.current = controls
    } catch (err) {
      console.error('Camera error:', err)
      setIsScanning(false)
      toast.error('Could not access camera.')
    }
  }

  const stopScanning = () => {
    controlsRef.current?.stop()
    controlsRef.current = null
    setIsScanning(false)
  }

  const switchCamera = () => {
    setUseFrontCamera((prev) => !prev)
    if (isScanning) {
      stopScanning()
      setTimeout(() => startScanning(), 100)
    }
  }

  const handleScanResult = async (data: string) => {
    // Prevent multiple rapid scans
    if (isProcessing) return
    
    stopScanning()
    setIsProcessing(true)

    try {
      // Accept multiple QR formats:
      //   1. vibe:qr:<uuid>      (current)
      //   2. vibe:email:<email>  (legacy)
      //   3. mailto:<email>      (legacy)
      //   4. Any email found in the QR
      let payload: { qr_identity?: string; email?: string }

      const qrMatch = data.match(/vibe:qr:([0-9a-f-]{36})/i)
      const emailMatch = data.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)

      if (qrMatch) {
        payload = { qr_identity: qrMatch[1].toLowerCase() }
      } else if (emailMatch) {
        payload = { email: emailMatch[0].trim().toLowerCase() }
      } else {
        throw new Error('Invalid QR code. Please scan a VIBE member pass.')
      }

      const response = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          event_id: selectedEventId
        })
      })

      const resData = await response.json()

      if (!response.ok) {
        throw new Error(resData.error || 'Failed to record attendance')
      }

      setScanResult({
        status: 'success',
        message: resData.member ? `${resData.member} checked in` : 'Attendance recorded successfully!',
        points: resData.points
      })

      // Optionally restart scanning after a delay
      setTimeout(() => {
        setScanResult(null)
        startScanning()
      }, 3000)

    } catch (err: unknown) {
      setScanResult({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error'
      })
      
      // Auto resume scan on error
      setTimeout(() => {
        setScanResult(null)
        startScanning()
      }, 3000)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-2xl mx-auto">
      <header className="text-center md:text-left">
        <h1 className="text-3xl font-bold tracking-tight mb-2">QR Scanner</h1>
        <p className="text-white/60">Scan member QR codes to log attendance and award points.</p>
      </header>

      <Card className="bg-white/5 border-white/10 ring-1 ring-white/10 shadow-xl overflow-hidden">
        <CardHeader className="bg-black/20 border-b border-white/10 flex flex-col gap-4 pb-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-400" />
              Live Scanner
            </CardTitle>
            <Button onClick={switchCamera} variant="outline" size="sm" className="h-8 border-white/10 bg-white/5 hover:bg-white/10 text-white">
              <SwitchCamera className="w-4 h-4 mr-2" />
              {useFrontCamera ? 'Front' : 'Back'}
            </Button>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm text-white/70 font-medium">Select Event for Attendance</label>
            <Select value={selectedEventId} onValueChange={(val) => setSelectedEventId(val || '')} disabled={isScanning}>
              <SelectTrigger className="bg-black/50 border-white/10 text-white">
                <SelectValue placeholder="-- Choose an Event --" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f0f13] border-white/10 text-white">
                {events.length === 0 && (
                  <SelectItem value="none" disabled>No events found</SelectItem>
                )}
                {events.map(event => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name} ({event.event_date})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 relative bg-black flex flex-col items-center justify-center min-h-[400px]">
          
          {hasCamera === false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0f] p-6 text-center">
              <Camera className="w-12 h-12 text-white/20 mb-4" />
              <p className="text-white/60 mb-4">Camera access denied or no camera found.</p>
              <Button onClick={() => window.location.reload()} variant="outline">Retry Access</Button>
            </div>
          )}

          <video 
            ref={videoRef} 
            className={`w-full h-[400px] object-cover ${isScanning ? 'opacity-100' : 'opacity-0 absolute'}`} 
          />

          {!isScanning && hasCamera !== false && !scanResult && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-10">
              <Button onClick={startScanning} size="lg" className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8">
                Tap to Start Scanning
              </Button>
            </div>
          )}

          {/* Scanner Overlay Overlay UI */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-purple-500/50 rounded-3xl relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-500 rounded-tl-3xl -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-500 rounded-tr-3xl -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-500 rounded-bl-3xl -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-500 rounded-br-3xl -mb-1 -mr-1"></div>
                <div className="absolute inset-0 bg-purple-500/10 animate-pulse"></div>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-20 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
              <p className="text-white font-medium animate-pulse">Processing Identity...</p>
            </div>
          )}

          {scanResult && (
            <div className="absolute inset-0 bg-[#050505] z-30 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
              {scanResult.status === 'success' ? (
                <>
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Verified!</h3>
                  <p className="text-white/60 mb-6">{scanResult.message}</p>
                  <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl w-full max-w-xs">
                    <p className="text-sm text-white/50 mb-1">Points Awarded</p>
                    <p className="text-3xl font-bold text-purple-400">+{scanResult.points}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                    <XCircle className="w-10 h-10 text-red-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Scan Failed</h3>
                  <p className="text-white/60">{scanResult.message}</p>
                </>
              )}
            </div>
          )}
        </CardContent>
        {isScanning && (
          <div className="bg-black/90 p-4 border-t border-white/10 flex justify-center">
            <Button variant="destructive" onClick={stopScanning}>Stop Camera</Button>
          </div>
        )}
      </Card>
    </div>
  )
}
