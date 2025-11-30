import asyncio
from typing import Dict, List
from collections import defaultdict


class ProgressTracker:
    """
    Singleton service for tracking and broadcasting progress updates via SSE.

    Agents publish progress events, and API endpoints subscribe to receive them.
    """

    def __init__(self):
        # {job_id: [queue1, queue2, ...]}
        self.subscribers: Dict[str, List[asyncio.Queue]] = defaultdict(list)

    async def publish(self, job_id: str, event: dict):
        """
        Publish a progress event to all subscribers for this job.

        Args:
            job_id: The job ID
            event: Event data (dict with agent, status, message, progress)
        """
        if job_id in self.subscribers:
            # Send to all queues for this job
            for queue in self.subscribers[job_id]:
                try:
                    await queue.put(event)
                except Exception as e:
                    print(f"Error publishing to queue: {e}")

    def subscribe(self, job_id: str) -> asyncio.Queue:
        """
        Subscribe to progress updates for a job.

        Args:
            job_id: The job ID to subscribe to

        Returns:
            Queue that will receive progress events
        """
        queue = asyncio.Queue()
        self.subscribers[job_id].append(queue)
        return queue

    def unsubscribe(self, job_id: str, queue: asyncio.Queue):
        """
        Unsubscribe from progress updates.

        Args:
            job_id: The job ID
            queue: The queue to remove
        """
        if job_id in self.subscribers:
            try:
                self.subscribers[job_id].remove(queue)
                # Clean up empty subscriber lists
                if not self.subscribers[job_id]:
                    del self.subscribers[job_id]
            except ValueError:
                pass  # Queue already removed


# Global singleton instance
progress_tracker = ProgressTracker()


def get_progress_tracker() -> ProgressTracker:
    """
    Get the global progress tracker instance.

    Returns:
        The singleton ProgressTracker instance
    """
    return progress_tracker
