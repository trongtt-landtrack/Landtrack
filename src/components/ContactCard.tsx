import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Phone, PhoneCall, MessageCircle, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'motion/react';

export default function ContactCard() {
  const [contact, setContact] = useState<{ phone: string; position: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContact() {
      try {
        const q = query(collection(db, 'allowed_phones'), orderBy('createdAt', 'asc'), limit(10));
        const snapshot = await getDocs(q);
        const contacts = snapshot.docs.map(doc => doc.data());
        
        if (contacts.length > 0) {
          const manager = contacts.find(c => 
            c.position?.toLowerCase().includes('quản lý') || 
            c.position?.toLowerCase().includes('giám đốc')
          );
          
          const selected = manager || contacts[0];
          setContact({
            phone: selected.phone,
            position: selected.position || 'Tư vấn viên'
          });
        }
      } catch (error) {
        console.error('Error fetching contact:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchContact();
  }, []);

  if (loading || !contact) return null;

  return (
    <div className="py-20 px-4 bg-app">
      <div className="max-w-7xl mx-auto">
        <div className="max-w-md mx-auto text-center mb-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest mb-4"
          >
            <Zap className="w-3 h-3" />
            Hỗ trợ trực tuyến
          </motion.div>
          <h2 className="text-3xl font-display font-bold text-primary mb-4 tracking-tight uppercase">
            Liên hệ tư vấn
          </h2>
          <p className="text-gray-500 text-sm font-sans max-w-xs mx-auto">
            Đội ngũ chuyên viên sẵn sàng hỗ trợ bạn tìm kiếm cơ hội đầu tư tốt nhất 24/7.
          </p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl shadow-primary/5 border border-gray-100 overflow-hidden group relative"
        >
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-accent/10 transition-colors duration-500"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -ml-16 -mb-16 group-hover:bg-primary/10 transition-colors duration-500"></div>

          <div className="p-8 md:p-10 text-center relative z-10">
            <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20 mx-auto mb-6 group-hover:scale-110 transition-transform duration-500 rotate-3 group-hover:rotate-0">
              <PhoneCall className="w-10 h-10 text-white" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-4">
              <ShieldCheck className="w-3 h-3 text-accent" />
              {contact.position}
            </div>

            <h3 className="text-4xl font-display font-black text-primary mb-10 tracking-tighter">
              {contact.phone}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a 
                href={`tel:${contact.phone}`}
                className="flex items-center justify-center gap-2 py-4 bg-accent text-white rounded-2xl font-display font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-accent/20 active:scale-95"
              >
                <Phone className="w-4 h-4" />
                GỌI NGAY
              </a>
              <a 
                href={`https://zalo.me/${contact.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-display font-bold text-sm hover:bg-gray-50 transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4 text-[#0068FF]" />
                CHAT ZALO
              </a>
            </div>
            
            <p className="mt-8 text-[11px] text-gray-400 font-sans italic">
              * Cuộc gọi có thể được ghi âm để nâng cao chất lượng dịch vụ.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
