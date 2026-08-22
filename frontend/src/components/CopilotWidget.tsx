import React, { useState } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const CopilotWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Hi ${user?.name?.split(' ')[0] || 'there'}! I'm your HR Copilot. Ask me about your leave balance, payroll, or company policies.` }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const newMsg = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    
    // Mock AI Response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `I found a matching policy. Based on your current balance, you have 12 paid time off days remaining. Would you like me to take you to the Request Time-Off page?`
      }]);
    }, 1000);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 h-14 w-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-transform hover:scale-105 ${isOpen ? 'hidden' : 'flex'}`}
      >
        <MessageSquare className="h-6 w-6" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden h-[500px]">
          {/* Header */}
          <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2 font-semibold">
              <Bot className="h-5 w-5" />
              HR Copilot (RAG AI)
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-600'}`}>
                  {msg.role === 'user' ? <User className="h-4 w-4"/> : <Bot className="h-4 w-4"/>}
                </div>
                <div className={`p-3 rounded-lg text-sm max-w-[80%] ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input 
              type="text" 
              className="flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Ask about leave policies..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="h-10 w-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 flex-shrink-0 disabled:opacity-50" disabled={!input.trim()}>
              <Send className="h-4 w-4 ml-0.5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
