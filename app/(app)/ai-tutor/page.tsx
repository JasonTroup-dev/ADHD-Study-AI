export default function aiTutor () {
    return (
        <div className="h-full w-full flex flex-col items-center">
            {/* Header */}
            <div className="flex items-center justify-center border border-red-500">
                <h1 className="text-2xl font-semibold">
                    AI Tutor
                </h1>
            </div>

            {/* AI Text Area */}
            <div className="flex flex-col items-center h-11/12 w-6/12 border border-green-600">

                <div className="h-11/12 w-12/12 border border-amber-300">

                </div>

                <div className="h-1/12 w-12/12 border border-red-500">

                </div>

            </div>

            {/* Input Text Area */}
            <div className="border border-yellow-200">
                <h1>test</h1>
            </div>
        </div>
    );
}