import Image from 'next/image';
import loading from './loading.svg'

export default function Loading() {
 return (
   <Image src={loading} alt="loading" />
 )
}
