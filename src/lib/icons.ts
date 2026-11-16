import type { Component } from 'vue'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  Folder, FolderArchive, FolderCheck, FolderHeart, FolderKanban, FolderKey,
  FolderLock, FolderMinus, FolderPlus, FolderSearch, FolderSymlink, FolderSync,
  FolderTree, FolderUp, FolderX, FileText, FileCode, Star, Bookmark,
  BookmarkCheck, Tag, Code, Terminal, Database, Globe, Archive, Image,
  Music, Video, Book, Calendar, Clock, CheckSquare, ListTodo, Sparkles,
  Zap, Flame, Heart, Smile, Coffee, Lightbulb, Compass, PenTool,
  Palette, Paintbrush, Search, Settings, User, Users, Shield, Key,
  Lock, Layers, Layers3, Box, Cpu, Bot, Truck, Car, Plane, Rocket,
  Briefcase, Wallet, ShoppingCart, GraduationCap, Home, MessageSquare,
  FolderGit2, Pin, CheckCircle2, AlertCircle, HelpCircle, Info,
} from 'lucide-vue-next'
import {
  faYoutube, faXTwitter, faInstagram, faFacebook, faTiktok, faLinkedin,
  faDiscord, faTelegram, faWhatsapp, faReddit, faGithub, faGitlab,
  faGoogle, faApple, faMicrosoft, faDocker, faPython, faJs, faReact,
  faVuejs, faRust, faNodeJs, faNpm, faAws, faFigma, faSpotify,
  faTwitch, faMedium, faSteam,
} from '@fortawesome/free-brands-svg-icons'

export { COLOR_OPTIONS, COLOR_MAP } from './colors'

export const LUCIDE_ICONS: Record<string, Component> = {
  Folder, FolderArchive, FolderCheck, FolderHeart, FolderKanban, FolderKey,
  FolderLock, FolderMinus, FolderPlus, FolderSearch, FolderSymlink, FolderSync,
  FolderTree, FolderUp, FolderX, FileText, FileCode, Star, Bookmark,
  BookmarkCheck, Tag, Code, Terminal, Database, Globe, Archive, Image,
  Music, Video, Book, Calendar, Clock, CheckSquare, ListTodo, Sparkles,
  Zap, Flame, Heart, Smile, Coffee, Lightbulb, Compass, PenTool,
  Palette, Paintbrush, Search, Settings, User, Users, Shield, Key,
  Lock, Layers, Layers3, Box, Cpu, Bot, Truck, Car, Plane, Rocket,
  Briefcase, Wallet, ShoppingCart, GraduationCap, Home, MessageSquare,
  FolderGit2, Pin, CheckCircle2, AlertCircle, HelpCircle, Info,
}

export const FA_BRAND_ICONS: Record<string, IconDefinition> = {
  youtube: faYoutube,
  twitter: faXTwitter,
  instagram: faInstagram,
  facebook: faFacebook,
  tiktok: faTiktok,
  linkedin: faLinkedin,
  discord: faDiscord,
  telegram: faTelegram,
  whatsapp: faWhatsapp,
  reddit: faReddit,
  github: faGithub,
  gitlab: faGitlab,
  google: faGoogle,
  apple: faApple,
  microsoft: faMicrosoft,
  docker: faDocker,
  python: faPython,
  js: faJs,
  react: faReact,
  vuejs: faVuejs,
  rust: faRust,
  nodejs: faNodeJs,
  npm: faNpm,
  aws: faAws,
  figma: faFigma,
  spotify: faSpotify,
  twitch: faTwitch,
  medium: faMedium,
  steam: faSteam,
}
