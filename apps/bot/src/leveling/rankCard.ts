import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";

// node:22-slim ships no fonts at all — the Dockerfile installs
// fonts-dejavu-core specifically so this path resolves; registered
// explicitly rather than relying on system font auto-discovery, which
// @napi-rs/canvas doesn't reliably do without a fontconfig cache.
const DEJAVU_SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const DEJAVU_SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
let fontsRegistered = false;
function ensureFontsRegistered(): void {
  if (fontsRegistered) return;
  GlobalFonts.registerFromPath(DEJAVU_SANS, "RankCardSans");
  GlobalFonts.registerFromPath(DEJAVU_SANS_BOLD, "RankCardSansBold");
  fontsRegistered = true;
}

const WIDTH = 900;
const HEIGHT = 260;
const AVATAR_SIZE = 160;
const AVATAR_X = 50;
const AVATAR_Y = (HEIGHT - AVATAR_SIZE) / 2;
const TEXT_X = AVATAR_X + AVATAR_SIZE + 40;

export interface RankCardInput {
  username: string;
  avatarUrl: string;
  level: number;
  currentLevelXp: number;
  neededForNextLevel: number;
  backgroundUrl?: string | null;
}

export async function renderRankCard(input: RankCardInput): Promise<Buffer> {
  ensureFontsRegistered();

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#171225";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (input.backgroundUrl) {
    const bg = await loadImage(input.backgroundUrl).catch(() => null);
    if (bg) {
      ctx.drawImage(bg, 0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "rgba(10, 8, 20, 0.5)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
  }

  const avatar = await loadImage(input.avatarUrl).catch(() => null);
  if (avatar) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(AVATAR_X + AVATAR_SIZE / 2, AVATAR_Y + AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, AVATAR_X, AVATAR_Y, AVATAR_SIZE, AVATAR_SIZE);
    ctx.restore();
  }

  ctx.fillStyle = "#f4f2fa";
  ctx.font = "36px RankCardSansBold";
  ctx.fillText(input.username, TEXT_X, AVATAR_Y + 50);

  ctx.fillStyle = "#c4b5fd";
  ctx.font = "26px RankCardSans";
  ctx.fillText(`Niveau ${input.level}`, TEXT_X, AVATAR_Y + 90);

  const barX = TEXT_X;
  const barY = AVATAR_Y + 115;
  const barWidth = WIDTH - TEXT_X - 50;
  const barHeight = 28;
  const ratio = input.neededForNextLevel > 0 ? Math.min(1, Math.max(0, input.currentLevelXp / input.neededForNextLevel)) : 0;

  ctx.fillStyle = "#2a2340";
  ctx.fillRect(barX, barY, barWidth, barHeight);
  ctx.fillStyle = "#7c3aed";
  ctx.fillRect(barX, barY, barWidth * ratio, barHeight);

  ctx.fillStyle = "#a79ec2";
  ctx.font = "18px RankCardSans";
  ctx.fillText(`${input.currentLevelXp} / ${input.neededForNextLevel} XP`, barX, barY + barHeight + 26);

  return canvas.toBuffer("image/png");
}
