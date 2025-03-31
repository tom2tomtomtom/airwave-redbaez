import React, { useRef, useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';

interface AudioWaveformProps {
  audioUrl: string;
  isPlaying: boolean;
  height?: number;
  barWidth?: number;
  barGap?: number;
  barColor?: string;
  progressColor?: string;
}

const WaveformContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
}));

/**
 * A component that visualizes audio as a waveform with playback progress.
 * Supports real-time visualization of currently playing audio.
 */
const AudioWaveform: React.FC<AudioWaveformProps> = ({
  audioUrl,
  isPlaying,
  height = 60,
  barWidth = 3,
  barGap = 1,
  barColor = '#B0BEC5',
  progressColor = '#2196F3',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioData, setAudioData] = useState<number[]>([]);

  // Create audio context and visualizer
  useEffect(() => {
    if (!audioUrl) return;

    // Cleanup previous audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    // Create new audio element
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
      generateWaveformData(audio);
    });

    audio.addEventListener('error', (e) => {
      console.error('Error loading audio:', e);
      setError('Failed to load audio');
      setLoading(false);
    });

    // Cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  // Handle play/pause changes
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.play().catch(err => {
        console.error('Failed to play audio:', err);
      });
      startAnimation();
    } else {
      audioRef.current.pause();
      stopAnimation();
    }
  }, [isPlaying]);

  // Draw the waveform when data changes
  useEffect(() => {
    if (audioData.length > 0) {
      drawWaveform();
      setLoading(false);
    }
  }, [audioData, currentTime]);

  // Generate pseudo-waveform data when we don't have real audio analysis
  const generateWaveformData = (audio: HTMLAudioElement) => {
    // In a real implementation, we would analyze the audio file here
    // using AudioContext and AnalyserNode
    // For this demo, we'll generate random data
    
    const sampleCount = Math.floor(audio.duration * 10); // 10 samples per second
    const data: number[] = [];
    
    // Generate some semi-random data that looks like a waveform
    for (let i = 0; i < sampleCount; i++) {
      // Create a somewhat natural looking waveform pattern
      const base = 0.3 + 0.2 * Math.sin(i / 3);
      const random = Math.random() * 0.5;
      data.push(base + random);
    }
    
    setAudioData(data);
  };

  // Animation for updating current time during playback
  const startAnimation = () => {
    const updateTime = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
        animationRef.current = requestAnimationFrame(updateTime);
      }
    };
    
    animationRef.current = requestAnimationFrame(updateTime);
  };

  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
  };

  // Draw the waveform on the canvas
  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || audioData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const totalBars = Math.min(
      audioData.length,
      Math.floor(canvas.width / (barWidth + barGap))
    );
    
    const barHeightMultiplier = canvas.height / 2;
    const progressPosition = (currentTime / duration) * totalBars;

    // Draw each bar
    for (let i = 0; i < totalBars; i++) {
      const x = i * (barWidth + barGap);
      const amplitude = audioData[i] || 0.5; // Default to half height if no data
      const barHeight = amplitude * barHeightMultiplier;
      
      // Change color based on playback position
      ctx.fillStyle = i < progressPosition ? progressColor : barColor;
      
      // Draw from the middle to make waveform symmetrical
      const centerY = canvas.height / 2;
      ctx.fillRect(
        x,
        centerY - barHeight / 2,
        barWidth,
        barHeight
      );
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={height}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height={height}
        color="error.main"
      >
        {error}
      </Box>
    );
  }

  return (
    <WaveformContainer>
      <canvas 
        ref={canvasRef} 
        width="100%" 
        height={height}
        style={{ width: '100%', height: height }}
      />
    </WaveformContainer>
  );
};

export default AudioWaveform;
