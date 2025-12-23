<script lang="ts">
	import { browser } from '$app/environment';

	export let status: 'idle' | 'active' | 'warning' | 'done' = 'idle';
	export let label: string;

	let prevStatus: typeof status = status;
	let vibrationFailed = false;

	function playBeep() {
		if (!browser) return;

		try {
			const ctx = new AudioContext();
			const oscillator = ctx.createOscillator();
			const gain = ctx.createGain();

			oscillator.type = 'sine';
			oscillator.frequency.value = 880;
			gain.gain.setValueAtTime(0.18, ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

			oscillator.connect(gain).connect(ctx.destination);
			oscillator.start();
			oscillator.stop(ctx.currentTime + 0.4);

			oscillator.onended = () => ctx.close();
		} catch (error) {
			console.error('Beep playback failed', error);
		}
	}

	function triggerVibration(pattern: VibratePattern): boolean {
		if (!browser || !('vibrate' in navigator)) return false;

		try {
			// Returns false if the device or browser blocks vibration.
			return navigator.vibrate(pattern);
		} catch (error) {
			console.error('Vibration failed', error);
			return false;
		}
	}

	// Trigger vibration once when a hold timer completes; fall back to a short beep if blocked.
	$: if (status === 'done' && prevStatus !== 'done') {
		const vibrated = triggerVibration([320, 120, 320]);
		if (!vibrated) {
			vibrationFailed = true;
			playBeep();
		}
	}

	$: prevStatus = status;
</script>

{#if status !== 'idle'}
	<div class={`stretch-timer ${status}`} aria-live="polite">
		{label}
	</div>
{/if}

{#if status === 'done' && vibrationFailed}
	<div class="haptic-warning">Vibration not available on this device/browser.</div>
{/if}

<style>
	.stretch-timer {
		position: fixed;
		bottom: 16px;
		left: 50%;
		transform: translateX(-50%);
		background: #007aff;
		color: white;
		padding: 14px 28px;
		border-radius: 999px;
		font-size: 22px;
		font-weight: 600;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		z-index: 1000;
		min-width: 120px;
		max-width: min(360px, calc(100% - 28px));
		width: max-content;
		text-align: center;
	}

	.stretch-timer.warning {
		background: #ff9500;
	}

	.stretch-timer.done {
		background: #4caf50;
	}

	@media (max-width: 540px) {
		.stretch-timer {
			padding: 12px 20px;
			font-size: 18px;
			width: calc(100% - 24px);
		}
	}

	.haptic-warning {
		position: fixed;
		bottom: 74px;
		left: 50%;
		transform: translateX(-50%);
		background: #fffbeb;
		color: #92400e;
		padding: 8px 12px;
		border-radius: 8px;
		font-size: 13px;
		border: 1px solid #fcd34d;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
		z-index: 1000;
	}
</style>
