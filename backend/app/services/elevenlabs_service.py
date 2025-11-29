"""
ElevenLabs service for managing speech-to-text sessions and transcriptions.
"""
import os
import base64
import time
import uuid
import struct
from typing import Dict, Optional, List, Any
from io import BytesIO
from elevenlabs import ElevenLabs
from dotenv import load_dotenv

load_dotenv()


class TranscriptEntry:
    """Data structure for a transcript with optional speaker information."""
    def __init__(self, text: str, speaker_id: Optional[str] = None):
        self.text = text
        self.speaker_id = speaker_id
        self.timestamp = time.time()
    
    def to_dict(self):
        return {
            "text": self.text,
            "speaker_id": self.speaker_id,
            "timestamp": self.timestamp
        }


class SessionData:
    """Data structure for an ElevenLabs session."""
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.transcripts: List[TranscriptEntry] = []  # Changed to store TranscriptEntry objects
        self.audio_chunks: List[bytes] = []  # Store raw PCM audio chunks
        self.last_activity: float = time.time()
        self.last_partial_transcript: Optional[str] = None
        self.last_partial_transcript_time: Optional[float] = None


class ElevenLabsService:
    """Service for managing ElevenLabs speech-to-text sessions."""
    
    def __init__(self):
        """Initialize ElevenLabs client."""
        api_key = os.getenv("ELEVENLABS_API_KEY")
        if not api_key:
            raise ValueError("ELEVENLABS_API_KEY not configured in environment")
        
        self.client = ElevenLabs(api_key=api_key)
        self.sessions: Dict[str, SessionData] = {}
    
    def create_session(self) -> str:
        """
        Create a new transcription session.
        
        Returns:
            Session ID (UUID string)
        """
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = SessionData(session_id)
        return session_id
    
    def add_audio_chunk(self, session_id: str, audio_base64: str, sample_rate: int = 16000) -> bool:
        """
        Add an audio chunk to the session buffer.
        
        Args:
            session_id: Session identifier
            audio_base64: Base64-encoded PCM audio data
            sample_rate: Audio sample rate (default: 16000)
            
        Returns:
            True if successful, False if session not found
        """
        if session_id not in self.sessions:
            return False
        
        try:
            # Decode base64 audio chunk
            audio_bytes = base64.b64decode(audio_base64)
            session = self.sessions[session_id]
            session.audio_chunks.append(audio_bytes)
            session.last_activity = time.time()
            return True
        except Exception as e:
            return False
    
    def commit_transcript(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Commit buffered audio and get transcription.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Transcribed text or None if error
        """
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        
        if not session.audio_chunks:
            return None
        
        try:
            # Combine all audio chunks into a single buffer
            combined_audio = b''.join(session.audio_chunks)
            
            if len(combined_audio) == 0:
                return None
            
            # Calculate audio duration
            # PCM 16-bit = 2 bytes per sample, 16000 samples per second
            # Duration in seconds = (bytes / 2) / 16000
            audio_duration_seconds = (len(combined_audio) / 2) / 16000
            
            # ElevenLabs requires minimum audio length (typically at least 0.5-1 second)
            # Let's require at least 1 second of audio
            MIN_AUDIO_DURATION_SECONDS = 1.0
            if audio_duration_seconds < MIN_AUDIO_DURATION_SECONDS:
                return None
            
            # Create WAV file with proper headers
            # WAV format: RIFF header + fmt chunk + data chunk
            sample_rate = 16000
            num_channels = 1  # Mono
            bits_per_sample = 16
            byte_rate = sample_rate * num_channels * (bits_per_sample // 8)
            block_align = num_channels * (bits_per_sample // 8)
            data_size = len(combined_audio)
            file_size = 36 + data_size  # 36 = header size
            
            # Create WAV file in memory
            wav_buffer = BytesIO()
            # RIFF header
            wav_buffer.write(b'RIFF')
            wav_buffer.write(struct.pack('<I', file_size))
            wav_buffer.write(b'WAVE')
            # fmt chunk
            wav_buffer.write(b'fmt ')
            wav_buffer.write(struct.pack('<I', 16))  # fmt chunk size
            wav_buffer.write(struct.pack('<H', 1))  # audio format (1 = PCM)
            wav_buffer.write(struct.pack('<H', num_channels))
            wav_buffer.write(struct.pack('<I', sample_rate))
            wav_buffer.write(struct.pack('<I', byte_rate))
            wav_buffer.write(struct.pack('<H', block_align))
            wav_buffer.write(struct.pack('<H', bits_per_sample))
            # data chunk
            wav_buffer.write(b'data')
            wav_buffer.write(struct.pack('<I', data_size))
            wav_buffer.write(combined_audio)
            
            # Reset position to beginning
            wav_buffer.seek(0)
            
            transcription = self.client.speech_to_text.convert(
                file=wav_buffer,
                model_id="scribe_v1",
                tag_audio_events=False,
                language_code="eng",
                diarize=True,
            )
            
            # Extract text and speaker information from transcription result
            transcript_text = None
            speaker_id = None
            
            # Check if it's a string
            if isinstance(transcription, str):
                transcript_text = transcription
            # Check if it's an object with attributes
            elif hasattr(transcription, '__dict__') or hasattr(transcription, '__class__'):
                # Try to get text
                if hasattr(transcription, 'text'):
                    transcript_text = transcription.text
                elif hasattr(transcription, 'transcription'):
                    transcript_text = transcription.transcription
                
                # Try to get speaker information
                if hasattr(transcription, 'speaker_id'):
                    speaker_id = transcription.speaker_id
                elif hasattr(transcription, 'speaker'):
                    speaker_id = transcription.speaker
                elif hasattr(transcription, 'words'):
                    # Check if words have speaker information
                    words = transcription.words
                    if words and len(words) > 0 and hasattr(words[0], 'speaker_id'):
                        speaker_id = words[0].speaker_id
            # Check if it's a dict
            elif isinstance(transcription, dict):
                transcript_text = transcription.get('text') or transcription.get('transcription')
                speaker_id = transcription.get('speaker_id') or transcription.get('speaker')
            
            if transcript_text and transcript_text.strip():
                # Create transcript entry with speaker info
                transcript_entry = TranscriptEntry(transcript_text, speaker_id)
                session.transcripts.append(transcript_entry)
                # Clear audio chunks after successful transcription
                session.audio_chunks = []
                session.last_activity = time.time()
                # Return both text and speaker_id
                return {
                    "text": transcript_text,
                    "speaker_id": speaker_id
                }
            else:
                # Use last partial transcript if available
                if session.last_partial_transcript:
                    time_since_partial = time.time() - (session.last_partial_transcript_time or 0)
                    if time_since_partial < 2.0:  # Within 2 seconds
                        transcript_text = session.last_partial_transcript
                        transcript_entry = TranscriptEntry(transcript_text, None)
                        session.transcripts.append(transcript_entry)
                        session.audio_chunks = []
                        session.last_partial_transcript = None
                        session.last_partial_transcript_time = None
                        return {
                            "text": transcript_text,
                            "speaker_id": None
                        }
                return None
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            return None
    
    def get_transcripts(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Get all transcripts for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            List of transcript dictionaries with text and optional speaker_id
        """
        if session_id not in self.sessions:
            return []
        
        session = self.sessions[session_id]
        session.last_activity = time.time()
        
        # Convert TranscriptEntry objects to dictionaries
        transcripts_data = [entry.to_dict() for entry in session.transcripts]
        return transcripts_data
    
    def disconnect_session(self, session_id: str) -> bool:
        """
        Disconnect and clean up a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            True if successful, False if session not found
        """
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False
    
    def cleanup_old_sessions(self, timeout_seconds: int = 300):
        """
        Clean up sessions that haven't been active for a while.
        
        Args:
            timeout_seconds: Seconds of inactivity before cleanup (default: 5 minutes)
        """
        current_time = time.time()
        sessions_to_remove = []
        
        for session_id, session in self.sessions.items():
            if current_time - session.last_activity > timeout_seconds:
                sessions_to_remove.append(session_id)
        
        for session_id in sessions_to_remove:
            del self.sessions[session_id]


# Global service instance
_elevenlabs_service: Optional[ElevenLabsService] = None


def get_elevenlabs_service() -> ElevenLabsService:
    """Get or create the global ElevenLabs service instance."""
    global _elevenlabs_service
    if _elevenlabs_service is None:
        _elevenlabs_service = ElevenLabsService()
    return _elevenlabs_service

