import { useEffect, useState, useRef } from 'react';
import { useStore } from './store/useStore';
import { 
  Trophy, Timer as TimerIcon, Play, Pause, Plus, Trash2, Users, LogOut, 
  Calendar, MapPin, DollarSign, ChevronRight, ArrowLeft, 
  Share2, Copy, ShieldAlert, Activity, RefreshCw, UserCheck, CheckCircle
} from 'lucide-react';

function App() {
  const {
    user, isAuthenticated, authLoading, currentView, currentPeladaId,
    toast, peladas, events, activeEventState, activeEventStats, elapsedSeconds, isTimerPaused,
    checkMe, navigate, login, registerUser, logout, showToast,
    createPelada, deletePelada,
    createEvent, updateEventStatus, deleteEvent,
    signUpPublic, adminAddPlayer, adminUpdateAttendance, adminRemoveAttendance,
    generateTeams, startMatch, recordGoal, endMatch, sendTimerUpdate
  } = useStore();

  // Local component states
  const [activeTab, setActiveTab] = useState<'JOGO' | 'PRESENÇA' | 'ESTATÍSTICAS'>('JOGO');
  const [publicTab, setPublicTab] = useState<'INSCRIÇÃO' | 'PLACAR' | 'ESTATÍSTICAS'>('INSCRIÇÃO');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regName, setRegName] = useState('');
  const [newPeladaName, setNewPeladaName] = useState('');
  const [newPeladaPlayers, setNewPeladaPlayers] = useState(5);
  const [newPeladaTime, setNewPeladaTime] = useState(10);
  const [newPeladaGols, setNewPeladaGols] = useState(2);
  const [newPeladaDraw, setNewPeladaDraw] = useState('BOTH_OUT');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventLoc, setNewEventLoc] = useState('');
  const [newEventPixKey, setNewEventPixKey] = useState('');
  const [newEventPixVal, setNewEventPixVal] = useState(0);
  const [guestName, setGuestName] = useState('');
  const [guestRole, setGuestRole] = useState<'LINE' | 'GOALKEEPER'>('LINE');
  const [publicName, setPublicName] = useState('');
  const [publicRole, setPublicRole] = useState<'LINE' | 'GOALKEEPER'>('LINE');
  
  // Goal Modal state
  const [showGoalModal, setShowGoalModal] = useState<{ teamId: string; side: 'home' | 'away' } | null>(null);
  const [goalScorerId, setGoalScorerId] = useState('');
  const [goalAssistantId, setGoalAssistantId] = useState('');

  // Timer Ref
  const timerIntervalRef = useRef<any>(null);

  // Initialize Auth Check
  useEffect(() => {
    checkMe();
    
    // Check if URL has a public event link: e.g. ?event=UUID
    const urlParams = new URLSearchParams(window.location.search);
    const eventParam = urlParams.get('event');
    if (eventParam) {
      navigate('EVENT_PUBLIC', { eventId: eventParam });
    }
  }, []);

  // Timer Tick Logic (Admin Only runs the local tick & updates socket)
  useEffect(() => {
    if (currentView === 'EVENT_ADMIN' && activeEventState?.activeMatch && !isTimerPaused) {
      timerIntervalRef.current = setInterval(() => {
        const nextSeconds = elapsedSeconds + 1;
        sendTimerUpdate(nextSeconds, false);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [currentView, activeEventState?.activeMatch, isTimerPaused, elapsedSeconds]);

  // If public view is opened, default the tab depending on status
  useEffect(() => {
    if (currentView === 'EVENT_PUBLIC' && activeEventState) {
      if (activeEventState.status === 'ACTIVE') {
        setPublicTab('PLACAR');
      } else {
        setPublicTab('INSCRIÇÃO');
      }
    }
  }, [currentView, activeEventState?.status]);

  if (authLoading) {
    return (
      <div className="container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <RefreshCw className="pulse-glow" style={{ color: 'var(--accent-primary)', width: 40, height: 40 }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Carregando 10 ou 2...</p>
      </div>
    );
  }

  // Toast Component
  const Toast = () => {
    if (!toast) return null;
    return (
      <div className={`glass slide-in`} style={{
        position: 'fixed',
        top: '1rem',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        padding: '0.75rem 1.25rem',
        borderRadius: 'var(--border-radius-md)',
        border: `1px solid ${toast.type === 'error' ? 'var(--error)' : toast.type === 'success' ? 'var(--success)' : 'var(--border-color)'}`,
        color: toast.type === 'error' ? 'var(--error)' : toast.type === 'success' ? 'var(--accent-primary)' : 'var(--text-primary)',
        boxShadow: 'var(--shadow-lg)',
        fontWeight: 600,
        fontSize: '0.9rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        {toast.type === 'error' && <ShieldAlert size={18} />}
        {toast.type === 'success' && <CheckCircle size={18} />}
        {toast.message}
      </div>
    );
  };

  const handleCopyLink = (eventId: string) => {
    const shareUrl = `${window.location.origin}?event=${eventId}`;
    navigator.clipboard.writeText(shareUrl);
    showToast('Link público copiado!', 'success');
  };

  const handleShareWhatsAppConvocacao = () => {
    if (!activeEventState) return;
    const dateStr = new Date(activeEventState.recentMatches[0]?.createdAt || Date.now()).toLocaleDateString('pt-BR');
    const text = `⚽ *CONVOCAÇÃO: ${activeEventState.name}* ⚽\n\n📌 *Local:* ${activeEventState.configs ? 'Pelada Confirmada' : ''}\n📅 *Data:* ${dateStr}\n\n👉 *Confirme sua presença entrando no link:* ${window.location.origin}?event=${activeEventState.eventId}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareWhatsAppResumo = () => {
    if (!activeEventState || !activeEventStats) return;
    const topScorer = activeEventStats.leaderboards.scorers[0];
    const topWinner = activeEventStats.leaderboards.wins[0];
    const text = `🏆 *RESUMO DA PELADA: ${activeEventState.name}* 🏆\n\n⚽ *Gols do dia:* ${activeEventStats.totalGoals}\n🔥 *Artilheiro:* ${topScorer ? `${topScorer.name} (${topScorer.goals} gols)` : 'Nenhum'}\n⭐ *Craque do dia (Vitórias):* ${topWinner ? `${topWinner.name} (${topWinner.wins} vitórias)` : 'Nenhum'}\n\nObrigado a todos e até a próxima! ⚽🔥`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // VIEWS RENDERING
  return (
    <div className="container">
      <Toast />

      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.5rem 0 1.5rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => isAuthenticated ? navigate('DASHBOARD') : navigate('LOGIN')}>
          <div style={{ width: 34, height: 34 }}>
            <svg viewBox="0 0 100 100" width="100%" height="100%">
              <circle cx="50" cy="50" r="46" fill="#121216" stroke="#39ff14" stroke-width="8"/>
              <text x="50" y="60" font-family="sans-serif" font-size="28" font-weight="bold" fill="#39ff14" text-anchor="middle">10</text>
            </svg>
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', letterSpacing: '-0.03em', lineHeight: 1 }}>10 ou 2</h2>
            <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gerenciador</span>
          </div>
        </div>

        {isAuthenticated && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{user?.name}</span>
            <button className="btn-icon" onClick={logout} title="Sair"><LogOut size={16} /></button>
          </div>
        )}
      </header>

      {/* MAIN CONTAINER CONTENT ROUTER */}

      {/* 1. LOGIN VIEW */}
      {currentView === 'LOGIN' && (
        <div className="slide-in" style={{ margin: 'auto 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.5rem', letterSpacing: '-0.04em', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Esqueça a <span style={{ color: 'var(--error)', textDecoration: 'line-through' }}>lista de papel</span>.
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Organize convocações, times, cronômetro e placar da sua pelada em tempo real com facilidade.
            </p>
          </div>

          <div className="card glass">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>Entrar na Conta</h3>
            <form onSubmit={(e) => { e.preventDefault(); login(loginEmail, loginPass); }}>
              <div className="form-group">
                <label>E-mail</label>
                <input type="email" placeholder="nome@exemplo.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Senha</label>
                <input type="password" placeholder="••••••••" value={loginPass} onChange={(e) => setLoginPass(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Entrar</button>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Novo por aqui? </span>
            <button className="btn-secondary" style={{ padding: '0.25rem 0.7rem', fontSize: '0.85rem' }} onClick={() => navigate('REGISTER')}>Criar Conta</button>
          </div>
        </div>
      )}

      {/* 2. REGISTER VIEW */}
      {currentView === 'REGISTER' && (
        <div className="slide-in" style={{ margin: 'auto 0' }}>
          <div className="card glass">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.15rem' }}>Crie sua conta de organizador</h3>
            <form onSubmit={(e) => { e.preventDefault(); registerUser(regEmail, regPass, regName); }}>
              <div className="form-group">
                <label>Nome Completo</label>
                <input type="text" placeholder="Seu nome" value={regName} onChange={(e) => setRegName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>E-mail</label>
                <input type="email" placeholder="nome@exemplo.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
              </div>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label>Senha</label>
                <input type="password" placeholder="Mínimo 6 caracteres" value={regPass} onChange={(e) => setRegPass(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }}>Cadastrar</button>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Já possui conta? </span>
            <button className="btn-secondary" style={{ padding: '0.25rem 0.7rem', fontSize: '0.85rem' }} onClick={() => navigate('LOGIN')}>Entrar</button>
          </div>
        </div>
      )}

      {/* 3. DASHBOARD VIEW (Super Admin Peladas) */}
      {currentView === 'DASHBOARD' && (
        <div className="slide-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem' }}>Minhas Peladas</h2>
          </div>

          {/* Form to create new Pelada */}
          <div className="card" style={{ backgroundColor: 'var(--bg-secondary)', borderStyle: 'dashed' }}>
            <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem', color: 'var(--accent-primary)' }}>Nova Pelada</h4>
            <div className="form-group">
              <input type="text" placeholder="Nome: ex: Futebol de Quinta" value={newPeladaName} onChange={(e) => setNewPeladaName(e.target.value)} />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Jogadores/Time</label>
                <select value={newPeladaPlayers} onChange={(e) => setNewPeladaPlayers(Number(e.target.value))}>
                  {[4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} na linha</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Tempo (Minutos)</label>
                <input type="number" value={newPeladaTime} onChange={(e) => setNewPeladaTime(Number(e.target.value))} min={1} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Limite de Gols</label>
                <input type="number" value={newPeladaGols} onChange={(e) => setNewPeladaGols(Number(e.target.value))} min={1} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Regra de Empate</label>
                <select value={newPeladaDraw} onChange={(e) => setNewPeladaDraw(e.target.value)}>
                  <option value="BOTH_OUT">Ambos Saem (Fila)</option>
                  <option value="PREVIOUS_WINNER">Antigo Vencedor Fica</option>
                  <option value="PENALTIES">Pênaltis (Tie-break)</option>
                </select>
              </div>
            </div>

            <button className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => {
              if (!newPeladaName) return showToast('Preencha o nome da pelada', 'error');
              createPelada({
                name: newPeladaName,
                playersPerTeam: newPeladaPlayers,
                matchTimeMinutes: newPeladaTime,
                matchGolLimit: newPeladaGols,
                drawRule: newPeladaDraw
              });
              setNewPeladaName('');
            }}>Criar Pelada</button>
          </div>

          {/* List Peladas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {peladas.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>Crie sua primeira pelada acima para começar!</p>
            ) : (
              peladas.map((p) => (
                <div key={p.id} className="card" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => navigate('PELADA_DETAIL', { peladaId: p.id })}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{p.name}</h3>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="badge badge-primary">{p.playersPerTeam} x {p.playersPerTeam}</span>
                      <span className="badge badge-secondary">{p.matchTimeMinutes} min</span>
                      {p.useGoalkeepers && <span className="badge" style={{ backgroundColor: 'rgba(0,229,255,0.1)', color: 'var(--accent-blue)', border: '1px solid rgba(0,229,255,0.2)' }}>Goleiro Fixo</span>}
                    </div>
                  </div>
                  <ChevronRight style={{ color: 'var(--text-muted)' }} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 4. PELADA DETAIL VIEW (Events List) */}
      {currentView === 'PELADA_DETAIL' && (
        <div className="slide-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <button className="btn-icon" onClick={() => navigate('DASHBOARD')}><ArrowLeft size={20} /></button>
            <h2 style={{ fontSize: '1.35rem' }}>Detalhes da Pelada</h2>
          </div>

          {/* Configuration Settings */}
          {peladas.find(p => p.id === currentPeladaId) && (
            <div className="card glass" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--accent-primary)' }}>{peladas.find(p => p.id === currentPeladaId).name}</h3>
                <button className="btn-icon" style={{ color: 'var(--error)' }} onClick={() => {
                  if (confirm('Deseja realmente deletar esta pelada e todos os seus eventos?')) {
                    deletePelada(currentPeladaId!);
                  }
                }}><Trash2 size={16} /></button>
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <p>⚙️ Configuração: {peladas.find(p => p.id === currentPeladaId).playersPerTeam} jogadores de linha | Tempo: {peladas.find(p => p.id === currentPeladaId).matchTimeMinutes} min | Limite de Gols: {peladas.find(p => p.id === currentPeladaId).matchGolLimit}</p>
                <p>⚖️ Empate: {peladas.find(p => p.id === currentPeladaId).drawRule === 'BOTH_OUT' ? 'Ambos saem da quadra' : 'Antigo vencedor permanece'}</p>
              </div>
            </div>
          )}

          {/* New Event Form */}
          <div className="card" style={{ borderStyle: 'dashed' }}>
            <h4 style={{ color: 'var(--accent-secondary)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>Marcar Novo Jogo (Evento)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Data</label>
                <input type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Horário</label>
                <input type="time" value={newEventTime} onChange={(e) => setNewEventTime(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Local (Arena / Quadra)</label>
              <input type="text" placeholder="Ex: Arena Soccer Gol" value={newEventLoc} onChange={(e) => setNewEventLoc(e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Chave Pix (Recebimento)</label>
                <input type="text" placeholder="CPF/Telefone" value={newEventPixKey} onChange={(e) => setNewEventPixKey(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Valor (R$)</label>
                <input type="number" value={newEventPixVal} onChange={(e) => setNewEventPixVal(Number(e.target.value))} min={0} />
              </div>
            </div>
            <button className="btn-primary" style={{ width: '100%' }} onClick={() => {
              if (!newEventDate || !newEventTime || !newEventLoc) return showToast('Preencha data, hora e local', 'error');
              createEvent({
                peladaId: currentPeladaId!,
                name: `Pelada do Dia ${new Date(newEventDate + 'T00:00:00').toLocaleDateString('pt-BR')}`,
                date: newEventDate,
                time: newEventTime,
                location: newEventLoc,
                pixKey: newEventPixKey || null,
                pixValue: newEventPixVal || null,
              });
              setNewEventDate('');
              setNewEventTime('');
              setNewEventLoc('');
              setNewEventPixKey('');
              setNewEventPixVal(0);
            }}>Confirmar Data</button>
          </div>

          {/* Events List */}
          <h3 style={{ fontSize: '1.1rem', margin: '1rem 0 0.5rem' }}>Próximas Peladas & Histórico</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {events.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1.5rem 0' }}>Marque um jogo acima para começar a convocação.</p>
            ) : (
              events.map((ev) => (
                <div key={ev.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem' }}>
                  <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => navigate('EVENT_ADMIN', { eventId: ev.id })}>
                    <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{ev.name}</h4>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Calendar size={12} /> {new Date(ev.date).toLocaleDateString('pt-BR')} às {ev.time}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><MapPin size={12} /> {ev.location}</span>
                    </div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <span className={`badge ${ev.status === 'ACTIVE' ? 'badge-primary' : ev.status === 'FINISHED' ? 'badge-secondary' : 'badge-secondary'}`}>{ev.status}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginLeft: '0.5rem' }}>
                    <button className="btn-icon" style={{ color: 'var(--accent-blue)' }} onClick={() => handleCopyLink(ev.id)} title="Copiar Link Público"><Share2 size={16} /></button>
                    <button className="btn-icon" style={{ color: 'var(--error)' }} onClick={() => {
                      if (confirm('Deletar este evento?')) deleteEvent(ev.id);
                    }}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 5. EVENT ADMIN VIEW (The main cockpit of the match) */}
      {currentView === 'EVENT_ADMIN' && activeEventState && (
        <div className="slide-in">
          {/* Header detail */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button className="btn-icon" onClick={() => navigate('PELADA_DETAIL', { peladaId: activeEventState.configs.useGoalkeepers ? activeEventState.eventId : currentPeladaId! })}><ArrowLeft size={18} /></button>
              <div>
                <h3 style={{ fontSize: '1.05rem', lineHeight: 1.1 }}>{activeEventState.name}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Painel de Controle</span>
              </div>
            </div>
            <div>
              {activeEventState.status === 'PRE_LIST' && (
                <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => updateEventStatus(activeEventState.eventId, 'ACTIVE')}>Iniciar Pelada</button>
              )}
              {activeEventState.status === 'ACTIVE' && (
                <button className="btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => {
                  if (confirm('Deseja finalizar o dia de jogo e consolidar as estatísticas?')) {
                    updateEventStatus(activeEventState.eventId, 'FINISHED');
                  }
                }}>Fechar Pelada</button>
              )}
              {activeEventState.status === 'FINISHED' && (
                <span className="badge badge-secondary">Finalizado</span>
              )}
            </div>
          </div>

          {/* Quick Info & Share link */}
          <div className="glass" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.6rem 1rem',
            borderRadius: 'var(--border-radius-md)',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            border: '1px solid var(--border-color)'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
              <Activity size={14} className="pulse-glow" /> Status: {activeEventState.status}
            </span>
            <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleCopyLink(activeEventState.eventId)}>
              <Copy size={12} /> Copiar Link
            </button>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            {(['JOGO', 'PRESENÇA', 'ESTATÍSTICAS'] as const).map((tab) => (
              <button
                key={tab}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '0.75rem 0',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  borderRadius: 0,
                  cursor: 'pointer'
                }}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* TAB 1: JOGO (Match controller) */}
          {activeTab === 'JOGO' && (
            <div className="slide-in">
              {(activeEventState.playingTeams.length + activeEventState.waitingQueue.length) === 0 ? (
                // Se não há times criados
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <Users size={32} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
                  <h4 style={{ marginBottom: '0.5rem' }}>Nenhum time formado ainda</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Confirme quem chegou na aba <b>PRESENÇA</b> e gere os times para começar as partidas.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button className="btn-primary" onClick={() => generateTeams('ARRIVAL_ORDER')}>
                      Formar por Ordem de Chegada
                    </button>
                    <button className="btn-secondary" onClick={() => generateTeams('RANDOM')}>
                      Formar por Sorteio
                    </button>
                  </div>
                </div>
              ) : (
                // Se já temos times gerados
                <div>
                  {/* Partida Ativa (Scoreboard) */}
                  <div className="card glass pulse-glow" style={{ border: '1px solid var(--border-hover)', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span className="badge badge-primary">Partida em Andamento</span>
                      {activeEventState.activeMatch && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          <TimerIcon size={16} />
                          <span style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1.1rem' }}>{formatTime(elapsedSeconds)}</span>
                        </div>
                      )}
                    </div>

                    {activeEventState.activeMatch ? (
                      <div>
                        {/* Score Board UI */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 1fr', alignItems: 'center', textAlign: 'center', marginBottom: '1rem' }}>
                          {/* Home Team */}
                          <div>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: activeEventState.activeMatch.homeTeam.color, display: 'inline-block', marginRight: '0.3rem' }}></div>
                            <h4 style={{ fontSize: '1.05rem', wordBreak: 'break-all' }}>{activeEventState.activeMatch.homeTeam.name}</h4>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                              <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setShowGoalModal({ teamId: activeEventState.activeMatch!.homeTeamId, side: 'home' })}>
                                <Plus size={12} /> Gol
                              </button>
                            </div>
                          </div>

                          {/* Placar */}
                          <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'monospace' }}>
                            {activeEventState.activeMatch.homeScore} - {activeEventState.activeMatch.awayScore}
                          </div>

                          {/* Away Team */}
                          <div>
                            <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: activeEventState.activeMatch.awayTeam.color, display: 'inline-block', marginRight: '0.3rem' }}></div>
                            <h4 style={{ fontSize: '1.05rem', wordBreak: 'break-all' }}>{activeEventState.activeMatch.awayTeam.name}</h4>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                              <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setShowGoalModal({ teamId: activeEventState.activeMatch!.awayTeamId, side: 'away' })}>
                                <Plus size={12} /> Gol
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* List of Goals this match */}
                        {activeEventState.activeMatch.goals.length > 0 && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', marginBottom: '1rem', textAlign: 'left' }}>
                            <p style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Gols:</p>
                            {activeEventState.activeMatch.goals.map((g, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>⚽ {g.scorer.name} {g.assistant ? `(assist: ${g.assistant.name})` : ''}</span>
                                <span style={{ color: g.teamId === activeEventState.activeMatch!.homeTeamId ? activeEventState.activeMatch!.homeTeam.color : activeEventState.activeMatch!.awayTeam.color }}>{g.teamId === activeEventState.activeMatch!.homeTeamId ? 'Home' : 'Away'}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Timer Control Buttons */}
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '1rem' }}>
                          <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => sendTimerUpdate(elapsedSeconds, !isTimerPaused)}>
                            {isTimerPaused ? <Play size={14} /> : <Pause size={14} />} {isTimerPaused ? 'Continuar' : 'Pausar'}
                          </button>
                          <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem' }} onClick={() => sendTimerUpdate(0, true)}>
                            Reset
                          </button>
                          <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => sendTimerUpdate(elapsedSeconds + 60, isTimerPaused)}>
                            +1m
                          </button>
                        </div>

                        {/* End Match button */}
                        <button className="btn-danger" style={{ width: '100%', padding: '0.5rem' }} onClick={() => {
                          if (finishedMatchIsDraw()) {
                            // If draw, open decision to choose who remains, or BOTH OUT
                            if (activeEventState.configs.drawRule === 'BOTH_OUT') {
                              endMatch();
                            } else {
                              const homeName = activeEventState.activeMatch!.homeTeam.name;
                              const awayName = activeEventState.activeMatch!.awayTeam.name;
                              const choice = confirm(`Partida empatada. Quem vence nos pênaltis/par-ou-ímpar?\nOK = ${homeName}\nCancelar = ${awayName}`);
                              endMatch(choice ? activeEventState.activeMatch!.homeTeamId : activeEventState.activeMatch!.awayTeamId);
                            }
                          } else {
                            endMatch();
                          }
                        }}>
                          Encerrar Partida
                        </button>
                      </div>
                    ) : (
                      // Se não há partida em andamento
                      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>Futebol pronto em campo. Inicie o cronômetro para valer!</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 1fr', alignItems: 'center', textAlign: 'center', marginBottom: '1.25rem' }}>
                          {activeEventState.playingTeams.map((team, idx) => (
                            <>
                              <div key={team.id}>
                                <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: team.color, display: 'inline-block', marginRight: '0.3rem' }}></div>
                                <h4 style={{ fontSize: '1rem' }}>{team.name}</h4>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{team.players.length} jogadores</span>
                              </div>
                              {idx === 0 && <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>VS</span>}
                            </>
                          ))}
                        </div>

                        <button className="btn-primary" style={{ width: '100%' }} onClick={startMatch}>
                          <Play size={16} /> Apitar Início de Jogo
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Goal Scorer Modal */}
                  {showGoalModal && (
                    <div style={{
                      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 99999, padding: '1rem'
                    }}>
                      <div className="card glass" style={{ width: '100%', maxWidth: '360px' }}>
                        <h4 style={{ marginBottom: '1rem', fontSize: '1.05rem', color: 'var(--accent-primary)' }}>Registrar Gol</h4>
                        <div className="form-group">
                          <label>Autor do Gol</label>
                          <select value={goalScorerId} onChange={(e) => setGoalScorerId(e.target.value)}>
                            <option value="">Selecione o jogador...</option>
                            {getGoalScorerOptions(showGoalModal.teamId).map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.role === 'GOALKEEPER' ? 'Goleiro' : 'Linha'})</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                          <label>Assistência (Opcional)</label>
                          <select value={goalAssistantId} onChange={(e) => setGoalAssistantId(e.target.value)}>
                            <option value="">Sem assistência</option>
                            {getGoalAssistantOptions(showGoalModal.teamId).map((p: any) => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn-secondary" style={{ flex: 1 }} onClick={() => { setShowGoalModal(null); setGoalScorerId(''); setGoalAssistantId(''); }}>Cancelar</button>
                          <button className="btn-primary" style={{ flex: 1 }} onClick={() => {
                            if (!goalScorerId) return showToast('Selecione quem marcou o gol', 'error');
                            recordGoal(showGoalModal.teamId, goalScorerId, goalAssistantId || undefined);
                            setShowGoalModal(null);
                            setGoalScorerId('');
                            setGoalAssistantId('');
                          }}>Salvar Gol</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fila de Espera */}
                  <h3 style={{ fontSize: '1.1rem', margin: '1.5rem 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Users size={18} /> Fila de Espera ({activeEventState.waitingQueue.length} times)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {activeEventState.waitingQueue.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>Não há outros times aguardando.</p>
                    ) : (
                      activeEventState.waitingQueue.map((team, idx) => (
                        <div key={team.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', marginBottom: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: idx === 0 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>#{idx + 1}</span>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: team.color }}></div>
                            <h4 style={{ fontSize: '0.95rem' }}>{team.name}</h4>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{team.players.length} jogadores</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Bench / Reservas */}
                  <h3 style={{ fontSize: '1.1rem', margin: '1.5rem 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UserCheck size={18} /> Banco de Reservas ({activeEventState.benchPlayers.length} jogadores)
                  </h3>
                  <div className="card" style={{ padding: '0.75rem', backgroundColor: 'var(--bg-secondary)' }}>
                    {activeEventState.benchPlayers.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '0.5rem 0' }}>Nenhum jogador na reserva.</p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {activeEventState.benchPlayers.map(p => (
                          <div key={p.id} style={{
                            padding: '0.3rem 0.6rem',
                            backgroundColor: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 'var(--border-radius-sm)',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}>
                            <span style={{ color: p.role === 'GOALKEEPER' ? 'var(--accent-blue)' : 'var(--accent-primary)', fontWeight: 'bold' }}>{p.role === 'GOALKEEPER' ? 'G' : 'L'}</span>
                            <span>{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Reset/Regenerate Teams Button */}
                  <button className="btn-secondary" style={{ width: '100%', marginTop: '1.5rem', borderColor: 'rgba(255, 61, 0, 0.2)', color: 'var(--error)' }} onClick={() => {
                    if (confirm('Atenção: Isso excluirá todas as partidas, placares e gols de hoje e formará os times novamente do zero. Confirmar reinício dos times?')) {
                      generateTeams('RANDOM');
                    }
                  }}>Resetar/Regerar Times</button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PRESENÇA (Check-in list & Add Guest) */}
          {activeTab === 'PRESENÇA' && (
            <div className="slide-in">
              {/* Add guest form */}
              <div className="card" style={{ padding: '1rem', borderStyle: 'dashed' }}>
                <h4 style={{ marginBottom: '0.5rem', fontSize: '0.95rem', color: 'var(--accent-primary)' }}>Confirmar Convidado na Hora</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="text" placeholder="Nome do jogador" value={guestName} onChange={(e) => setGuestName(e.target.value)} style={{ flex: 1 }} />
                  <select value={guestRole} onChange={(e) => setGuestRole(e.target.value as any)} style={{ width: '90px', padding: '0.5rem' }}>
                    <option value="LINE">Linha</option>
                    <option value="GOALKEEPER">Goleiro</option>
                  </select>
                  <button className="btn-primary" style={{ padding: '0.5rem 0.75rem' }} onClick={() => {
                    if (!guestName) return showToast('Preencha o nome do convidado', 'error');
                    adminAddPlayer(guestName, guestRole, 'PRESENT');
                    setGuestName('');
                  }}><Plus size={16} /></button>
                </div>
              </div>

              {/* Stats of Presence */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <div className="glass" style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--border-radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Presentes</span>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    {activeEventState.attendances.filter(a => a.status === 'PRESENT').length}
                  </p>
                </div>
                <div className="glass" style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--border-radius-md)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Pré-lista</span>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                    {activeEventState.attendances.filter(a => a.status === 'PRE_LIST').length}
                  </p>
                </div>
              </div>

              {/* Main lists */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activeEventState.attendances.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>Lista vazia. Envie o link para os jogadores se inscreverem!</p>
                ) : (
                  activeEventState.attendances.map((att) => (
                    <div key={att.id} className="card" style={{ padding: '0.75rem 1rem', marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: att.status === 'CUT' ? 0.5 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                        <span style={{
                          fontWeight: 'bold',
                          fontSize: '0.75rem',
                          color: att.role === 'GOALKEEPER' ? 'var(--accent-blue)' : 'var(--accent-primary)',
                          border: `1px solid ${att.role === 'GOALKEEPER' ? 'rgba(0,229,255,0.3)' : 'rgba(57,255,20,0.3)'}`,
                          padding: '0.15rem 0.3rem',
                          borderRadius: '3px'
                        }} onClick={() => {
                          const nextRole = att.role === 'LINE' ? 'GOALKEEPER' : 'LINE';
                          adminUpdateAttendance(att.id, { role: nextRole });
                        }} title="Clique para alterar papel">
                          {att.role === 'GOALKEEPER' ? 'GOLEIRO' : 'LINHA'}
                        </span>
                        
                        <div>
                          <h4 style={{ fontSize: '0.95rem' }}>{att.name}</h4>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            Status: {att.status === 'PRE_LIST' ? 'Pré-lista' : att.status === 'PRESENT' ? 'Presente' : 'Cortado'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {/* Paid Toggle */}
                        {activeEventState.pixValue && activeEventState.pixValue > 0 ? (
                          <button className="btn-icon" style={{ color: att.paid ? 'var(--success)' : 'var(--text-muted)' }} onClick={() => adminUpdateAttendance(att.id, { paid: !att.paid })} title="Pago/Chave Pix">
                            <DollarSign size={16} />
                          </button>
                        ) : null}

                        {/* Status Checkin actions */}
                        {att.status === 'PRE_LIST' && (
                          <button className="btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => adminUpdateAttendance(att.id, { status: 'PRESENT' })}>Confirmar</button>
                        )}

                        {att.status === 'PRESENT' && (
                          <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--error)' }} onClick={() => adminUpdateAttendance(att.id, { status: 'CUT', teamId: null })}>Cortar</button>
                        )}

                        {att.status === 'CUT' && (
                          <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => adminUpdateAttendance(att.id, { status: 'PRESENT' })}>Retornar</button>
                        )}

                        {/* Excluir da lista */}
                        <button className="btn-icon" style={{ color: 'var(--error)' }} onClick={() => {
                          if (confirm(`Remover ${att.name}?`)) adminRemoveAttendance(att.id);
                        }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ESTATÍSTICAS (Consolidation & Share) */}
          {activeTab === 'ESTATÍSTICAS' && activeEventStats && (
            <div className="slide-in">
              {/* Share actions */}
              <div className="card glass" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.95rem' }}>📢 Compartilhar no WhatsApp</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-primary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }} onClick={handleShareWhatsAppConvocacao}>
                    <Share2 size={14} /> Link Convocação
                  </button>
                  <button className="btn-secondary" style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem' }} onClick={handleShareWhatsAppResumo}>
                    <Trophy size={14} /> Resumo do Jogo
                  </button>
                </div>
              </div>

              {/* Event Stats Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div className="card" style={{ marginBottom: 0, textAlign: 'center', padding: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Partidas Jogadas</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{activeEventStats.totalMatches}</p>
                </div>
                <div className="card" style={{ marginBottom: 0, textAlign: 'center', padding: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total de Gols</span>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>{activeEventStats.totalGoals}</p>
                </div>
              </div>

              {/* Leaderboards */}
              <div className="card glass" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--accent-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Trophy size={16} /> Artilharia (Gols)</h4>
                {activeEventStats.leaderboards.scorers.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nenhum gol registrado.</p>
                ) : (
                  activeEventStats.leaderboards.scorers.slice(0, 5).map((s, idx) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <span>#{idx + 1} {s.name}</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{s.goals} gols</span>
                    </div>
                  ))
                )}
              </div>

              <div className="card glass" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--accent-blue)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Trophy size={16} /> Garçons (Assistências)</h4>
                {activeEventStats.leaderboards.assistants.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nenhuma assistência registrada.</p>
                ) : (
                  activeEventStats.leaderboards.assistants.slice(0, 5).map((a, idx) => (
                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <span>#{idx + 1} {a.name}</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent-blue)' }}>{a.assists} assists</span>
                    </div>
                  ))
                )}
              </div>

              <div className="card glass" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--accent-yellow)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Trophy size={16} /> Craques (Vitórias)</h4>
                {activeEventStats.leaderboards.wins.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nenhuma partida concluída.</p>
                ) : (
                  activeEventStats.leaderboards.wins.slice(0, 5).map((w, idx) => (
                    <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <span>#{idx + 1} {w.name}</span>
                      <span style={{ fontWeight: 'bold', color: 'var(--accent-yellow)' }}>{w.wins} vitórias ({w.matchesPlayed} j)</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. EVENT PUBLIC SPECTATOR / SIGNUP VIEW */}
      {currentView === 'EVENT_PUBLIC' && activeEventState && (
        <div className="slide-in">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>{activeEventState.name}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Placar ao Vivo & Pré-lista Pública</p>
          </div>

          {/* Navigation Tabs for public */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
            {(['INSCRIÇÃO', 'PLACAR', 'ESTATÍSTICAS'] as const).map((tab) => (
              <button
                key={tab}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  borderBottom: publicTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: publicTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '0.75rem 0',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  borderRadius: 0,
                  cursor: 'pointer'
                }}
                onClick={() => setPublicTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab INSCRIÇÃO: Signup or lists */}
          {publicTab === 'INSCRIÇÃO' && (
            <div className="slide-in">
              {activeEventState.status === 'FINISHED' ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <Trophy size={36} style={{ color: 'var(--accent-yellow)', marginBottom: '1rem' }} />
                  <h4>Evento Encerrado!</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Confira as estatísticas e premiações na aba de estatísticas.</p>
                </div>
              ) : (
                <div>
                  {/* Signup form */}
                  <div className="card glass" style={{ padding: '1.25rem' }}>
                    <h4 style={{ marginBottom: '0.75rem', fontSize: '1rem', color: 'var(--accent-primary)' }}>Adicionar meu Nome na Lista</h4>
                    <div className="form-group">
                      <input type="text" placeholder="Escreva seu Nome Completo" value={publicName} onChange={(e) => setPublicName(e.target.value)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                      <label>Função no Campo</label>
                      <select value={publicRole} onChange={(e) => setPublicRole(e.target.value as any)}>
                        <option value="LINE">Jogador de Linha</option>
                        <option value="GOALKEEPER">Goleiro Fixo</option>
                      </select>
                    </div>
                    <button className="btn-primary" style={{ width: '100%' }} onClick={() => {
                      if (!publicName) return showToast('Preencha seu nome', 'error');
                      signUpPublic(activeEventState.eventId, publicName, publicRole);
                      setPublicName('');
                    }}>Confirmar Presença</button>
                  </div>

                  {/* Payment Pix panel */}
                  {activeEventState.pixValue && activeEventState.pixValue > 0 && (
                    <div className="card" style={{ border: '1px solid rgba(255, 179, 0, 0.3)', backgroundColor: 'rgba(255, 179, 0, 0.05)' }}>
                      <h4 style={{ color: 'var(--warning)', fontSize: '0.95rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><DollarSign size={16} /> Contribuição da Pelada</h4>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Valor: <b>R$ {activeEventState.pixValue.toFixed(2)}</b></p>
                      {activeEventState.pixKey && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>Chave Pix: <code style={{ userSelect: 'all', cursor: 'pointer' }} onClick={() => {
                          navigator.clipboard.writeText(activeEventState.pixKey!);
                          showToast('Chave Pix copiada!', 'success');
                        }}>{activeEventState.pixKey}</code></p>
                      )}
                    </div>
                  )}

                  {/* Public signups list */}
                  <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Jogadores Confirmados ({activeEventState.attendances.length})</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {activeEventState.attendances.map((att: any, index: number) => (
                      <div key={att.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.6rem 0.8rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)'
                      }}>
                        <span style={{ fontSize: '0.9rem' }}>{index + 1}. {att.name}</span>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                          <span className={`badge ${att.role === 'GOALKEEPER' ? 'badge-secondary' : 'badge-primary'}`}>{att.role === 'GOALKEEPER' ? 'Goleiro' : 'Linha'}</span>
                          <span className={`badge`} style={{
                            backgroundColor: att.status === 'PRESENT' ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.05)',
                            color: att.status === 'PRESENT' ? 'var(--accent-primary)' : 'var(--text-muted)'
                          }}>{att.status === 'PRESENT' ? 'Confirmado' : 'Pré-lista'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab PLACAR: Spectator live dashboard */}
          {publicTab === 'PLACAR' && (
            <div className="slide-in">
              {activeEventState.status !== 'ACTIVE' ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 0' }}>A pelada ainda não foi iniciada pelo organizador.</p>
              ) : (
                <div>
                  {/* Live Scoreboard display */}
                  <div className="card glass pulse-glow" style={{ border: '1px solid var(--accent-primary)', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Activity size={10} className="pulse-glow" /> Jogo ao Vivo</span>
                      {activeEventState.activeMatch && (
                        <span style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{formatTime(elapsedSeconds)}</span>
                      )}
                    </div>

                    {activeEventState.activeMatch ? (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 50px 1fr', alignItems: 'center', textAlign: 'center', marginBottom: '1rem' }}>
                          <div>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: activeEventState.activeMatch.homeTeam.color, display: 'inline-block', marginRight: '0.2rem' }}></div>
                            <h4 style={{ fontSize: '1rem' }}>{activeEventState.activeMatch.homeTeam.name}</h4>
                          </div>
                          <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'monospace' }}>
                            {activeEventState.activeMatch.homeScore} - {activeEventState.activeMatch.awayScore}
                          </div>
                          <div>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: activeEventState.activeMatch.awayTeam.color, display: 'inline-block', marginRight: '0.2rem' }}></div>
                            <h4 style={{ fontSize: '1rem' }}>{activeEventState.activeMatch.awayTeam.name}</h4>
                          </div>
                        </div>

                        {activeEventState.activeMatch.goals.length > 0 && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', textAlign: 'left' }}>
                            {activeEventState.activeMatch.goals.map((g, idx) => (
                              <div key={idx}>⚽ {g.scorer.name} {g.assistant ? `(assist: ${g.assistant.name})` : ''}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem' }}>Aguardando apito do organizador para iniciar a partida.</p>
                    )}
                  </div>

                  {/* Fila de Espera */}
                  <h4 style={{ fontSize: '1rem', margin: '1.25rem 0 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Users size={16} /> Próximos na Fila</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {activeEventState.waitingQueue.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '0.75rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>Nenhum outro time na fila.</p>
                    ) : (
                      activeEventState.waitingQueue.map((team, idx) => (
                        <div key={team.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '0.6rem 0.8rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)'
                        }}>
                          <span style={{ fontSize: '0.85rem' }}><b>#{idx + 1}</b> {team.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{team.players.length} jogadores</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab ESTATÍSTICAS: Leaderboards */}
          {publicTab === 'ESTATÍSTICAS' && activeEventStats && (
            <div className="slide-in">
              <div className="card glass" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>⚽ Artilharia</h4>
                {activeEventStats.leaderboards.scorers.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nenhum gol registrado.</p>
                ) : (
                  activeEventStats.leaderboards.scorers.map((s, idx) => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.25rem 0' }}>
                      <span>#{idx + 1} {s.name}</span>
                      <span style={{ fontWeight: 'bold' }}>{s.goals} gols</span>
                    </div>
                  ))
                )}
              </div>

              <div className="card glass" style={{ padding: '1rem' }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-yellow)', marginBottom: '0.5rem' }}>⭐ Vitórias</h4>
                {activeEventStats.leaderboards.wins.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nenhuma partida concluída.</p>
                ) : (
                  activeEventStats.leaderboards.wins.map((w, idx) => (
                    <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.25rem 0' }}>
                      <span>#{idx + 1} {w.name}</span>
                      <span style={{ fontWeight: 'bold' }}>{w.wins} vitórias ({w.matchesPlayed} j)</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        padding: '2rem 0 1rem',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border-color)'
      }}>
        10 ou 2 &copy; 2026. Made with ⚽ for amateur champions.
      </footer>
    </div>
  );

  // Helper selectors for goal scorer selection
  function getGoalScorerOptions(teamId: string) {
    if (!activeEventState) return [];
    const team = activeEventState.playingTeams.find((t: any) => t.id === teamId) || 
                 activeEventState.waitingQueue.find((t: any) => t.id === teamId);
    return team ? team.players : [];
  }

  function getGoalAssistantOptions(teamId: string) {
    if (!activeEventState) return [];
    const team = activeEventState.playingTeams.find((t: any) => t.id === teamId) || 
                 activeEventState.waitingQueue.find((t: any) => t.id === teamId);
    if (!team) return [];
    // Can assist other players, except the scorer itself
    return team.players.filter((p: any) => p.id !== goalScorerId);
  }

  function finishedMatchIsDraw() {
    if (!activeEventState?.activeMatch) return false;
    return activeEventState.activeMatch.homeScore === activeEventState.activeMatch.awayScore;
  }
}

export default App;
