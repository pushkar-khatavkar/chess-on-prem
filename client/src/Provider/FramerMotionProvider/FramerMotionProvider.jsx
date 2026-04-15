import { motion } from "framer-motion";
function FramerMotionProvider({children}){
    return(
        <motion.div
              initial={{ opacity: 0,y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
            {children}
        </motion.div>
    )
}
export default FramerMotionProvider;