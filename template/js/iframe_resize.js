/**
 * Dynamic iframe resizer script for cross-origin parent-child communication.
 * 
 * - Observes DOM mutations and window resizing
 * - Posts height to parent window for dynamic resizing
 * - Supports nested iframe response behavior (optional)
 * 
 * Usage:
 *   <iframe src="child.html" style="width:100%; border:none;"></iframe>
 *   In child.html, include this script to auto-resize the iframe in the parent.
 * 
 * Cross-origin note: Parent and child must both allow postMessage communication.
 */

// Helper: Notify parent of current scroll height
const sendPostMessage = () => {
	const height = document.scrollingElement?.scrollHeight || document.body.scrollHeight;
	window.parent.postMessage({ frameHeight: height }, "*");
};

// Observe DOM changes to trigger resizing
const observer = new MutationObserver((mutationsList) => {
	if (mutationsList.length > 0) {
		sendPostMessage();
	}
});

observer.observe(document.body, {
	attributes: true,
	childList: true,
	subtree: true
});

// Handle window resize events
window.addEventListener("resize", sendPostMessage);

// Initial sync
document.addEventListener("DOMContentLoaded", sendPostMessage);

/**
 * Optional: Nested iframe handler
 * Listens for height messages from child and applies height to inner iframe
 * Note: Only works if manually added inside a nested iframe.
 */
window.addEventListener("message", (e) => {
	if (!e.data || typeof e.data !== "object") return;

	if ("frameHeight" in e.data) {
		const iframe = document.querySelector("iframe");
		if (iframe) {
			iframe.style.height = `${e.data.frameHeight}px`;
		}
	}
});
