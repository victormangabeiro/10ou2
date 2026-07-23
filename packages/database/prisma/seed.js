const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seeding do banco de dados...');

  // 1. Limpar dados existentes
  await prisma.goal.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.player.deleteMany({});
  await prisma.peladaAdmin.deleteMany({});
  await prisma.pelada.deleteMany({});
  await prisma.user.deleteMany({});

  // 2. Criar Super Admin padrão
  const email = 'admin@10ou2.com';
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email,
      name: 'Vitor Organizador',
      passwordHash,
    },
  });
  console.log('Super Admin criado:', admin.email);

  // 3. Criar Pelada Recorrente
  const pelada = await prisma.pelada.create({
    data: {
      name: 'Pelada de Quinta (Arena Soccer)',
      ownerId: admin.id,
      playersPerTeam: 5,
      useGoalkeepers: true,
      matchTimeMinutes: 10,
      matchGolLimit: 2,
      drawRule: 'BOTH_OUT',
    },
  });
  console.log('Pelada recorrente criada:', pelada.name);

  // 4. Criar Evento (Dia de Jogo)
  const today = new Date();
  const event = await prisma.event.create({
    data: {
      peladaId: pelada.id,
      name: `Futebol de Quinta - Rodada ${today.toLocaleDateString('pt-BR')}`,
      date: today,
      time: '19:30',
      location: 'Arena Soccer Premium - Quadra 2',
      status: 'PRE_LIST',
      pixKey: 'contato@10ou2.com',
      pixValue: 15.00,
    },
  });
  console.log('Evento do dia criado:', event.name);

  // 5. Criar 18 jogadores fixos (16 de linha e 2 goleiros)
  const playerNames = [
    { name: 'Victor Hugo', role: 'LINE' },
    { name: 'Neymar Jr', role: 'LINE' },
    { name: 'Lionel Messi', role: 'LINE' },
    { name: 'Cristiano Ronaldo', role: 'LINE' },
    { name: 'Ronaldinho Gaúcho', role: 'LINE' },
    { name: 'Zinedine Zidane', role: 'LINE' },
    { name: 'Ronaldo Fenômeno', role: 'LINE' },
    { name: 'Romário', role: 'LINE' },
    { name: 'Pelé', role: 'LINE' },
    { name: 'Maradona', role: 'LINE' },
    { name: 'Kaká', role: 'LINE' },
    { name: 'Adriano Imperador', role: 'LINE' },
    { name: 'Roberto Carlos', role: 'LINE' },
    { name: 'Cafu', role: 'LINE' },
    { name: 'Daniel Alves', role: 'LINE' },
    { name: 'Thiago Silva', role: 'LINE' },
    // Goleiros
    { name: 'Dida Goleiro', role: 'GOALKEEPER' },
    { name: 'Marcos Goleiro', role: 'GOALKEEPER' },
  ];

  console.log('Criando jogadores e adicionando à presença...');
  
  for (let i = 0; i < playerNames.length; i++) {
    const p = playerNames[i];
    
    // Criar perfil do jogador permanente
    const player = await prisma.player.create({
      data: {
        name: p.name,
        defaultRole: p.role,
        createdById: admin.id,
      },
    });

    // Definir status de presença (alguns presentes, outros na pré-lista)
    // 12 primeiros já chegaram (PRESENT), os demais estão na lista de espera (PRE_LIST)
    const isPresent = i < 12 || p.role === 'GOALKEEPER';
    const status = isPresent ? 'PRESENT' : 'PRE_LIST';
    
    // Pago ou não (aleatório para simular controle financeiro)
    const paid = i % 3 === 0;

    await prisma.attendance.create({
      data: {
        eventId: event.id,
        playerId: player.id,
        name: player.name,
        role: p.role,
        status,
        paid,
      },
    });
  }

  console.log('Seeding concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro durante o seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
