export default function ComingSoonOverlay() {
    return (
        <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-gray-200/35"
            aria-label="Coming soon"
        >
            <svg
                aria-hidden="true"
                className="absolute inset-0 h-full w-full text-gray-500/70"
                preserveAspectRatio="none"
                viewBox="0 0 100 100"
            >
                <line
                    x1="0"
                    y1="0"
                    x2="100"
                    y2="100"
                    stroke="currentColor"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                />
                <line
                    x1="100"
                    y1="0"
                    x2="0"
                    y2="100"
                    stroke="currentColor"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>

            <span className="relative rounded-full border border-gray-700 bg-gray-900 px-5 py-2 text-sm font-bold tracking-wide text-white shadow-md">
                Coming Soon
            </span>
        </div>
    )
}
