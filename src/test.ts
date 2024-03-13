import Query from './paramquery';

class PrizesQuery extends Query<number, string>
{
    protected async query( id: number )
    {
        return 'data' + id;
    }
}

class ComplexQuery extends Query<{ id?: string, children?: number[] }, string>
{
    protected async query( params: { id?: string, children?: number[] })
    {
        return 'data' + params.id;
    }
}

const prizes = new PrizesQuery();
const complex = new ComplexQuery();

const x = prizes.use( 1 );

//@ts-ignore
console.log( x );

prizes.set( 1, 'data2' );

//@ts-ignore
console.log( x );

//@ts-ignore
console.log( complex.use({}) );

//@ts-ignore
console.log( complex.use({ id: 1 }) );

//@ts-ignore
console.log( complex.use({ id: 1, children: [ 7, 3 ] }));