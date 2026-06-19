// Alarm system for HW Tracker

let audioContext: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let beepInterval: NodeJS.Timeout | null = null;

export function playAlarmSound(volume: number = 100) {
  if (beepInterval) {
    clearInterval(beepInterval);
    beepInterval = null;
  }

  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const vol = Math.max(0, Math.min(100, volume)) / 100;
  
  // Create a repeating beep pattern
  const playBeep = () => {
    oscillator = audioContext!.createOscillator();
    const gainNode = audioContext!.createGain();
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(880, audioContext!.currentTime); // A5
    
    gainNode.gain.setValueAtTime(vol, audioContext!.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext!.currentTime + 0.1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext!.destination);
    
    oscillator.start();
    oscillator.stop(audioContext!.currentTime + 0.1);
  };

  playBeep();
  beepInterval = setInterval(playBeep, 500);
}

export function stopAlarmSound() {
  if (beepInterval) {
    clearInterval(beepInterval);
    beepInterval = null;
  }
  if (oscillator) {
    try {
      oscillator.stop();
    } catch (e) {
      // Ignore if already stopped
    }
  }
}

export function buildAlarmMessage(carName: string, carType: string, platform: string, price: string, pincode: string): string {
  return `FOUND: ${carName} (${carType}) is IN STOCK on ${platform}! ₹${price.replace('₹', '')} · Pincode ${pincode}`;
}

export function buildTelegramMessage(carName: string, carType: string, platform: string, price: string, pincode: string): string {
  return `🔔 FOUND: ${carName} (${carType}) is IN STOCK on ${platform}!\nPrice: ${price}\nPincode: ${pincode}`;
}

export function triggerBrowserNotifications(title: string, body: string) {
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
}

export function stopBrowserNotifications() {
  // Browser notifications no longer use an interval, so nothing to clear here.
}
