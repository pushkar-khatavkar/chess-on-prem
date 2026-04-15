function GameNotFound(){
    return (
        <section className="text-white h-[100vh] w-[100vw] backdrop-blur-sm absolute z-100 flex justify-center items-center text-2xl font-bold flex-col p-4">
            <div className="flex flex-col justify-center items-center gap-4 p-8 rounded-xl">
                <p className="text-red-800 p-4 rounded-sm">404 Game Not Found</p>
                <img src="/danny_pawn.82d0fa70.gif"></img>
            </div>
        </section>
    )
}

export default GameNotFound;