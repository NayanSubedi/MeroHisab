import React from 'react';
import { Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';

export type ConfirmType = 'danger' | 'warning' | 'info';

interface CustomConfirmProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: ConfirmType;
    confirmText?: string;
    cancelText?: string;
}

const CustomConfirm: React.FC<CustomConfirmProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    type = 'danger',
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}) => {
    if (!isOpen) return null;

    const getConfig = () => {
        switch (type) {
            case 'danger':
                return {
                    icon: <Trash2 size={26} className="text-red-600 dark:text-red-400" />,
                    bg: 'from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/20',
                    btnHover: 'hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400'
                };
            case 'warning':
                return {
                    icon: <AlertTriangle size={26} className="text-amber-600 dark:text-amber-400" />,
                    bg: 'from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/20',
                    btnHover: 'hover:bg-amber-50 dark:hover:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                };
            case 'info':
            default:
                return {
                    icon: <ShieldAlert size={26} className="text-blue-600 dark:text-blue-400" />,
                    bg: 'from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/20',
                    btnHover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                };
        }
    };

    const config = getConfig();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-7 text-center">
                    <div className={`mx-auto w-14 h-14 bg-gradient-to-br ${config.bg} rounded-2xl flex items-center justify-center mb-4 shadow-inner`}>
                        {config.icon}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{message}</p>
                </div>
                <div className="flex border-t border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                    <button 
                        onClick={onCancel} 
                        className="flex-1 py-3.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm} 
                        className={`flex-1 py-3.5 text-sm font-bold transition-colors border-l border-gray-300 dark:border-gray-700 ${config.btnHover}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomConfirm;
