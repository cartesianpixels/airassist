import Image from 'next/image';

export function AirAssistLogo() {
  return (
    <div className="p-2">
       <Image 
        src="https://us.ivao.aero/wp-content/uploads/2024/04/us-full-blue.png"
        alt="IVAO US Division Logo"
        width={150}
        height={40}
        priority
      />
    </div>
  );
}
