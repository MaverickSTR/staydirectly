import React from "react";
import { 
  Wifi, 
  Car, 
  Coffee, 
  Tv, 
  ChefHat, 
  Bed, 
  Droplets, 
  Utensils, 
  Gamepad2, 
  Flame, 
  Snowflake, 
  AlertTriangle, 
  Sun, 
  Sparkles, 
  Laptop, 
  DoorOpen, 
  Pill, 
  Baby, 
  TreePine, 
  Fan, 
  Table, 
  Heart, 
  Blend, 
  Thermometer, 
  Refrigerator, 
  Scissors, 
  Luggage, 
  Microwave, 
  GlassWater, 
  BookOpen, 
  Zap, 
  Wind, 
  Sofa, 
  FanIcon, 
  Monitor, 
  Moon, 
  Drill, 
  Bath, 
  Table2, 
  ThermometerIcon, 
  Store, 
  Droplets as DropletsIcon, 
  Paintbrush, 
  Coffee as CoffeeIcon, 
  Shield, 
  Droplets as ShampooIcon, 
  DoorClosed, 
  Gamepad, 
  SprayCan, 
  ThermometerSun, 
  WashingMachine, 
  Globe, 
  Droplets as SoapIcon, 
  Drill as GrillIcon, 
  Coffee as Nespresso, 
  UtensilsCrossed, 
  Cookie, 
  Package, 
  ParkingCircle, 
  Droplets as ShowerGel, 
  Wine, 
  Puzzle,
  Shirt
} from "lucide-react";

interface AmenityIconProps {
  amenity: string;
  className?: string;
}

const AmenityIcon: React.FC<AmenityIconProps> = ({ 
  amenity, 
  className = "h-5 w-5 text-gray-600" 
}) => {
  // Convert amenity to lowercase for case-insensitive matching
  const amenityKey = amenity.toLowerCase().replace(/[^a-z0-9]/g, '_');
  
  const iconMap: Record<string, React.ComponentType<any>> = {
    // WiFi & Internet
    wireless_internet: Wifi,
    wifi: Wifi,
    
    // Parking
    free_parking: Car,
    street_parking: Car,
    parking: Car,
    
    // Coffee & Beverages
    coffee_maker: Coffee,
    coffee: Coffee,
    nespresso_machine: Nespresso,
    hot_water_kettle: ThermometerIcon,
    hot_water: ThermometerIcon,
    
    // Entertainment
    tv: Tv,
    game_console: Gamepad,
    arcade_machine: Gamepad2,
    ping_pong_table: Table2,
    board_games: Puzzle,
    books: BookOpen,
    
    // Kitchen & Cooking
    kitchen: ChefHat,
    cooking_basics: Utensils,
    oven: Store,
    stove: Store,
    microwave: Microwave,
    refrigerator: Refrigerator,
    freezer: Snowflake,
    dishwasher: Store,
    blender: Blend,
    toaster: Zap,
    dishes_and_silverware: GlassWater,
    barbeque_utensils: Drill,
    bbq_area: GrillIcon,
    wine_glasses: Wine,
    baking_sheet: Cookie,
    
    // Bedroom & Bathroom
    bed_linens: Bed,
    extra_pillows_and_blankets: Pill,
    hangers: Shirt,
    bathtub: Bath,
    shower_gel: ShowerGel,
    shampoo: ShampooIcon,
    conditioner: DropletsIcon,
    body_soap: SoapIcon,
    hair_dryer: Scissors,
    wardrobe_or_closet: DoorClosed,
    private_living_room: Sofa,
    
    // Outdoor & Patio
    patio: DoorOpen,
    patio_or_belcony: DoorOpen,
    garden_or_backyard: TreePine,
    outdoor_seating: UtensilsCrossed,
    alfresco_dining: UtensilsCrossed,
    fire_pit: Flame,
    jacuzzi: Sparkles,
    
    // Safety & Security
    smoke_detector: AlertTriangle,
    fire_extinguisher: Shield,
    carbon_monoxide_detector: Shield,
    first_aid_kit: Heart,
    
    // Laundry
    washer: WashingMachine,
    dryer: WashingMachine,
    clothes_drying_rack: Sun,
    
    // Climate Control
    ac: Wind,
    heating: ThermometerSun,
    ceiling_fan: Fan,
    portable_fans: FanIcon,
    room_darkening_shades: Moon,
    
    // Workspace
    laptop_friendly_workspace: Laptop,
    
    // Entrance & Access
    private_entrance: DoorOpen,
    luggage_dropoff_allowed: Luggage,
    
    // Family & Kids
    pack_n_play_travel_crib: Baby,
    
    // Dining
    dining_table: Table,
    
    // Essentials
    essentials: Package,
    cleaning_products: SprayCan,
    theme_room: Paintbrush,
    
    // Default fallback
    default: Wifi
  };

  const IconComponent = iconMap[amenityKey] || iconMap.default;
  
  return <IconComponent className={className} />;
};

export default AmenityIcon;
