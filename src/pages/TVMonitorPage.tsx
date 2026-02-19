<!DOCTYPE html>
<html lang="pt-pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TECNOFRIO - TV Monitor Design Mockup</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@800&display=swap');
        
        body { font-family: 'Inter', sans-serif; overflow: hidden; }
        .mono { font-family: 'JetBrains+Mono', monospace; }
        
        @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .animate-marquee { animation: marquee 30s linear infinite; }
        
        @keyframes scroll-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
        .animate-scroll { animation: scroll-left 40s linear infinite; }
    </style>
</head>
<body class="bg-slate-100 h-screen flex flex-col">

    <!-- HEADER -->
    <header class="h-[14vh] bg-white border-b-[12px] border-[#2B4F84] px-12 flex items-center justify-between shadow-2xl z-50">
        <div class="flex items-center gap-8">
            <div class="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center font-black text-[#2B4F84] text-xs">LOGO</div>
            <div>
                <h1 class="text-6xl font-black tracking-tighter text-[#2B4F84]">TECNO<span class="text-slate-200">FRIO</span></h1>
                <p class="text-slate-400 text-2xl font-bold uppercase tracking-[0.3em] font-sans">Monitor de Fluxo</p>
            </div>
        </div>
        <div class="text-right">
            <p class="text-8xl mono font-black text-[#2B4F84] tracking-tighter">15:57:30</p>
            <p class="text-2xl text-slate-500 font-bold uppercase tracking-tight">quinta-feira, 19 de fevereiro</p>
        </div>
    </header>

    <!-- CAROUSEL SECTION -->
    <main class="flex-1 p-10 flex flex-col gap-12 overflow-hidden justify-center">
        
        <!-- ROW 1 -->
        <div class="h-[35vh] overflow-hidden flex items-center">
            <div class="flex gap-12 animate-scroll">
                <!-- CARD 1 -->
                <div class="w-[700px] h-full bg-white rounded-[3rem] p-12 border-[8px] border-slate-100 shadow-2xl flex flex-col justify-between">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="mono text-6xl font-black text-[#2B4F84]">TF-00008</p>
                            <span class="inline-block px-6 py-2 bg-blue-100 text-[#2B4F84] rounded-2xl text-2xl font-black mt-2">NA OFICINA</span>
                        </div>
                        <div class="bg-red-600 text-white px-8 py-4 rounded-3xl text-3xl font-black animate-pulse">URGENTE</div>
                    </div>
                    <div>
                        <p class="text-6xl font-black text-slate-900 uppercase">CLIENTE EXEMPLO</p>
                        <p class="text-3xl font-bold text-slate-400 mt-2 uppercase">FRIGORÍFICO AMERICANO</p>
                    </div>
                </div>
                <!-- CARD 2 -->
                <div class="w-[700px] h-full bg-white rounded-[3rem] p-12 border-[8px] border-slate-100 shadow-2xl flex flex-col justify-between">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="mono text-6xl font-black text-[#2B4F84]">TF-00012</p>
                            <span class="inline-block px-6 py-2 bg-green-100 text-green-700 rounded-2xl text-2xl font-black mt-2">EM EXECUÇÃO</span>
                        </div>
                    </div>
                    <div>
                        <p class="text-6xl font-black text-slate-900 uppercase">PEDRO LUCAS</p>
                        <p class="text-3xl font-bold text-slate-400 mt-2 uppercase">MÁQUINA DE LAVAR</p>
                    </div>
                </div>
                <!-- Duplicate for Loop -->
                <div class="w-[700px] h-full bg-white rounded-[3rem] p-12 border-[8px] border-slate-100 shadow-2xl flex flex-col justify-between">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="mono text-6xl font-black text-[#2B4F84]">TF-00008</p>
                            <span class="inline-block px-6 py-2 bg-blue-100 text-[#2B4F84] rounded-2xl text-2xl font-black mt-2">NA OFICINA</span>
                        </div>
                    </div>
                    <div>
                        <p class="text-6xl font-black text-slate-900 uppercase">CLIENTE EXEMPLO</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- ROW 2 -->
        <div class="h-[35vh] overflow-hidden flex items-center">
            <div class="flex gap-12 animate-scroll">
                <!-- CARD 3 -->
                <div class="w-[700px] h-full bg-white rounded-[3rem] p-12 border-[8px] border-slate-100 shadow-2xl flex flex-col justify-between">
                    <div>
                        <p class="mono text-6xl font-black text-[#2B4F84]">TF-00015</p>
                        <span class="inline-block px-6 py-2 bg-amber-100 text-amber-700 rounded-2xl text-2xl font-black mt-2">AGUARDA PEÇA</span>
                    </div>
                    <div>
                        <p class="text-6xl font-black text-slate-900 uppercase">MARIA SILVA</p>
                        <p class="text-3xl font-bold text-slate-400 mt-2 uppercase">AR CONDICIONADO</p>
                    </div>
                </div>
                 <!-- CARD 4 -->
                 <div class="w-[700px] h-full bg-white rounded-[3rem] p-12 border-[8px] border-slate-100 shadow-2xl flex flex-col justify-between">
                    <div>
                        <p class="mono text-6xl font-black text-[#2B4F84]">TF-00020</p>
                        <span class="inline-block px-6 py-2 bg-slate-100 text-slate-500 rounded-2xl text-2xl font-black mt-2">A PRECIFICAR</span>
                    </div>
                    <div>
                        <p class="text-6xl font-black text-slate-900 uppercase">JOÃO OLIVEIRA</p>
                        <p class="text-3xl font-bold text-slate-400 mt-2 uppercase">FORNO ELÉTRICO</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- FOOTER -->
    <footer class="h-[22vh] bg-[#2B4F84] border-t-[12px] border-yellow-400 p-10 relative overflow-hidden flex items-center">
        <div class="absolute top-6 left-12 flex items-center gap-6 z-20 bg-[#2B4F84] pr-12 py-2 text-yellow-400">
            <svg class="w-12 h-12 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            <span class="text-4xl font-black uppercase tracking-[0.4em]">ATIVIDADES RECENTES</span>
        </div>
        <div class="flex gap-20 animate-marquee whitespace-nowrap mt-8">
             <div class="flex items-center gap-8 bg-white/10 border-4 border-white/20 rounded-[3rem] px-16 py-8">
                <span class="text-4xl text-yellow-300 mono font-black">[15:40]</span>
                <span class="text-5xl text-white font-black uppercase">CARLOS CRIOU O SERVIÇO TF-00025</span>
            </div>
            <div class="flex items-center gap-8 bg-white/10 border-4 border-white/20 rounded-[3rem] px-16 py-8">
                <span class="text-4xl text-yellow-300 mono font-black">[14:50]</span>
                <span class="text-5xl text-white font-black uppercase">PEDRO FINALIZOU A REPARAÇÃO TF-00010</span>
            </div>
            <!-- Duplicate for Marquee Loop -->
            <div class="flex items-center gap-8 bg-white/10 border-4 border-white/20 rounded-[3rem] px-16 py-8">
                <span class="text-4xl text-yellow-300 mono font-black">[15:40]</span>
                <span class="text-5xl text-white font-black uppercase">CARLOS CRIOU O SERVIÇO TF-00025</span>
            </div>
        </div>
    </footer>

</body>
</html>

