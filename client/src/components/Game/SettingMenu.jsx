import { CiSettings } from "react-icons/ci";
function SettingMenu({resign}){
    return (
        <section>
            <div className="fab">
                <div tabIndex={0} role="button" className="btn btn-lg btn-circle bg-[#ec4899]">
                    <div className="inline-flex items-center justify-center text-white font-bold">
                        <CiSettings className="w-6 h-6" />
                    </div>
                </div>
                <div className="fab-close">
                    <span className="btn btn-circle btn-lg btn-error">✕</span>
                </div>
                <div className="text-white text-xl">Resign <button className="btn btn-lg btn-circle" onClick={resign}>R</button></div>
                <div className="text-white text-xl">Draw <button className="btn btn-lg btn-circle">D</button></div>
                </div>
        </section>
    )
}
export default SettingMenu;