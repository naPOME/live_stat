import { TopPlayersWidget } from '@/components/TopPlayersWidget';

export default function TopPlayersPage() {
  const dummyPlayers = [
    { name: "PLAYER 1", eliminations: 7, damage: 1540, survivalTime: "25:12", assists: 3, imageUrl: "https://liquipedia.net/commons/images/thumb/f/f2/Paraboy_NOVA_Esports_China_2020.png/600px-Paraboy_NOVA_Esports_China_2020.png" },
    { name: "PLAYER 2", eliminations: 5, damage: 1200, survivalTime: "24:10", assists: 2, imageUrl: "https://liquipedia.net/commons/images/thumb/f/f2/Paraboy_NOVA_Esports_China_2020.png/600px-Paraboy_NOVA_Esports_China_2020.png" },
    { name: "PLAYER 3", eliminations: 4, damage: 980, survivalTime: "22:45", assists: 5, imageUrl: "https://liquipedia.net/commons/images/thumb/f/f2/Paraboy_NOVA_Esports_China_2020.png/600px-Paraboy_NOVA_Esports_China_2020.png" },
    { name: "PLAYER 4", eliminations: 3, damage: 850, survivalTime: "21:30", assists: 1, imageUrl: "https://liquipedia.net/commons/images/thumb/f/f2/Paraboy_NOVA_Esports_China_2020.png/600px-Paraboy_NOVA_Esports_China_2020.png" },
    { name: "PLAYER 5", eliminations: 2, damage: 700, survivalTime: "19:20", assists: 4, imageUrl: "https://liquipedia.net/commons/images/thumb/f/f2/Paraboy_NOVA_Esports_China_2020.png/600px-Paraboy_NOVA_Esports_China_2020.png" },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 md:p-8">
      <TopPlayersWidget
        stageText="SEMI FINAL"
        matchText="DAY 1 MATCH 1"
        players={dummyPlayers}
      />
    </div>
  );
}
